## ADDED Requirements

### Requirement: 首頁輸出 LocalBusiness 與 WebSite JSON-LD

首頁 SHALL 內嵌兩個 `application/ld+json` data block：`LocalBusiness`（含 `@id: {baseUrl}/#business`、中英名稱、alternateName「信淳茶居」（Google Maps 店名）、image、電話 +886-972-619-391、完整 PostalAddress（嘉義縣梅山鄉太興村8鄰溪頭19號之2、郵遞區號 603、TW）、描述、priceRange、`geo` 座標（23.5537537, 120.6324229）、`hasMap`（maps.google.com?cid= 形式）、`openingHoursSpecification`（週一至週日 08:00–18:00）、`sameAs`（IG／FB／LINE 官方帳號，不得使用個人帳號連結））與 `WebSite`（name、alternateName、url）。

#### Scenario: AI 解析首頁店家實體

- **WHEN** 爬蟲解析首頁 HTML
- **THEN** 取得 LocalBusiness 節點，其 `@id` 為 `{baseUrl}/#business`，地址、電話、描述齊備

### Requirement: FAQ 頁輸出 FAQPage JSON-LD

FAQ 頁 SHALL 將 Sanity 的 FAQ 內容（PortableText 轉純文字）輸出為 `FAQPage` schema，每筆為 `Question` + `acceptedAnswer.Answer`；無 FAQ 資料時不輸出空節點。

#### Scenario: AI 引用常見問題

- **WHEN** 爬蟲解析 /faq
- **THEN** FAQPage 的 mainEntity 數量與頁面顯示的 FAQ 筆數一致，答案為純文字（無 PortableText 結構殘留）

### Requirement: 產品列表輸出 ItemList JSON-LD

/products SHALL 輸出 `ItemList`，每個 `ListItem.item` 為 `Product`（name、description、image、`Offer`：price、priceCurrency TWD、availability InStock）。

#### Scenario: AI 查詢茶葉品項與價格

- **WHEN** 爬蟲解析 /products
- **THEN** 每個上架產品都有對應 Product 節點且含 TWD 價格

### Requirement: 體驗詳細頁輸出 Product 與 BreadcrumbList JSON-LD

`/experiences/[slug]`（含 `/en` 變體）SHALL 輸出：(1) `Product`——name/alternateName 依 locale 對應中英名稱、description（seoDescription 優先，否則 tagline）、image 絕對網址、url 為當前 locale 的頁面網址、`brand`、`Offer`（price、TWD、InStock、`seller` 以 `@id: {baseUrl}/#business` 引用首頁 LocalBusiness）；(2) `BreadcrumbList`——首頁 → 茶山體驗 → 當前體驗，名稱與網址依 locale。

#### Scenario: 中文體驗頁

- **WHEN** 爬蟲解析 `/experiences/tea-ceremony`
- **THEN** Product.name 為中文名、url 為 `{baseUrl}/experiences/tea-ceremony`、offers.price 等於 DB 中該體驗現價、seller 引用 `{baseUrl}/#business`

#### Scenario: 英文體驗頁

- **WHEN** 爬蟲解析 `/en/experiences/tea-ceremony`
- **THEN** Product.name 為英文名、url 為 `{baseUrl}/en/experiences/tea-ceremony`、BreadcrumbList 各層名稱為英文

### Requirement: JSON-LD 安全序列化

全站所有 JSON-LD SHALL 經 `src/lib/seo.ts` 的 `jsonLdString()` 序列化：`JSON.stringify` 後將 `<` 轉義為 `<`，防止內容（CMS/DB 來源）含 `</script>` 時突破 script 標籤執行注入。

#### Scenario: 內容含 script 關閉標籤

- **WHEN** 任一 JSON-LD 欄位值含 `</script><script>alert(1)</script>`
- **THEN** 輸出的 HTML 中該值不含字面 `<` 字元（呈現為 `<`），瀏覽器不會提前關閉 data block，注入不成立
