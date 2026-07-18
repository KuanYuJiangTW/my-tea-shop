## ADDED Requirements

### Requirement: sitemap 雙語輸出與 hreflang

`src/app/sitemap.ts` SHALL 為每個公開頁面（9 個靜態頁 + 動態體驗頁）輸出兩個 URL 條目——zh-TW（無前綴）與 en（`/en` 前綴）——且每個條目附 `alternates.languages`（產生 `xhtml:link rel="alternate" hreflang` 標記），zh-TW 與 en 互相指向。

#### Scenario: 英文頁進入 sitemap

- **WHEN** 讀取 production `/sitemap.xml`
- **THEN** `/en`、`/en/products`、`/en/experiences/...` 等英文 URL 存在，且每個 `<url>` 都含 zh-TW 與 en 兩條 hreflang alternate 連結

#### Scenario: 動態體驗頁雙語條目

- **WHEN** DB 有 N 個上架體驗
- **THEN** sitemap 含 2N 個體驗頁條目（zh + en 各一）

### Requirement: 各頁 canonical 與 hreflang metadata

每個公開頁面 SHALL 透過 `src/lib/seo.ts` 的 `langAlternates(path)` 宣告 metadata：`canonical` 為 zh 路徑、`languages` 含 zh-TW（原路徑）與 en（`/en` 前綴；首頁 `/` 對應 `/en`）。root layout SHALL NOT 設定全站 canonical（Next.js metadata 淺層合併會使未宣告頁面誤繼承「canonical=首頁」的重複內容訊號）。

#### Scenario: 公開頁面的 head 輸出

- **WHEN** 渲染 /products 頁
- **THEN** head 含 `rel="canonical"` 指向 /products、`hreflang="zh-TW"` 指向 /products、`hreflang="en"` 指向 /en/products

#### Scenario: 未宣告 alternates 的頁面

- **WHEN** 渲染未使用 langAlternates 的頁面（如 /cart、/checkout）
- **THEN** 不輸出 canonical（而非誤指向首頁）

### Requirement: 正式網域一致性

所有 `NEXT_PUBLIC_BASE_URL` 的程式碼 fallback SHALL 為 `https://taiwantea.store`（robots.ts、sitemap.ts、layout.tsx、各頁 JSON-LD），不得殘留 `my-tea-shop.vercel.app`。

#### Scenario: 環境變數缺失時

- **WHEN** NEXT_PUBLIC_BASE_URL 未設定
- **THEN** robots.txt 的 Sitemap 行、sitemap 的 URL、canonical/OG/JSON-LD 網址一律以 `https://taiwantea.store` 為基底
