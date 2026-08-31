# tea-knowledge-articles Specification

## Purpose
TBD - created by archiving change tea-knowledge-content. Update Purpose after archive.
## Requirements
### Requirement: 文章內容模型
Sanity SHALL 提供 `article` document，讓業主不改程式碼就能發文。

必填欄位：`slug`、`title`、`excerpt`、`publishedAt`。
雙語成對欄位：`title`／`titleEn`、`excerpt`／`excerptEn`、`keywords`／`keywordsEn`、
`coverImageAlt`／`coverImageAltEn`，以及 `sections[].paragraphs`／`paragraphsEn`。
另有 `coverImage`、`updatedAt`、`sections`（小標＋段落陣列）、`relatedExperiences`。

英文欄位留空時 SHALL 回退中文內容，SHALL NOT 讓英文頁出現空白區塊。

#### Scenario: 業主在 Studio 發一篇新文章
- **WHEN** 業主填妥 slug、標題、摘要、發布日期並發布
- **THEN** 文章出現在 `/tea-guide` 列表與 `/tea-guide/<slug>`，不需要任何程式碼改動

#### Scenario: 只填中文沒填英文
- **WHEN** 文章的 `titleEn`／`excerptEn`／`paragraphsEn` 留空
- **THEN** `/en/tea-guide/<slug>` 顯示中文內容，頁面結構完整、不出現空白段落

### Requirement: 文章列表頁
`/tea-guide`（含 `/en` 變體）SHALL 列出已發布文章，並以 `revalidate = 3600` 快取。

#### Scenario: 正常列出文章
- **WHEN** 使用者造訪 `/tea-guide`
- **THEN** 頁面列出各篇文章的封面圖、標題與摘要，點擊進入該篇文章頁

#### Scenario: Sanity 取不到資料
- **WHEN** Sanity 查詢失敗（`getArticles` 捕捉例外後回傳空陣列）
- **THEN** 頁面正常算繪並顯示空狀態，SHALL NOT 拋錯或回 500
  ——內容平台掛掉不該把整個網站帶下去

### Requirement: 文章詳細頁
`/tea-guide/[slug]`（含 `/en` 變體）SHALL 以 `generateStaticParams` 預先產生已知文章路徑，
並以 `revalidate = 3600` 更新。

#### Scenario: 造訪存在的文章
- **WHEN** slug 對應到一篇已發布文章
- **THEN** 顯示文章內容，metadata 帶 `langAlternates("/tea-guide/<slug>")` 的雙語 hreflang

#### Scenario: 造訪不存在的文章
- **WHEN** slug 查無對應文章
- **THEN** 回傳 404（`notFound()`），SHALL NOT 顯示空殼頁面

### Requirement: 文章頁輸出結構化資料
文章頁 SHALL 同時輸出 `Article`、`BreadcrumbList` 兩組 JSON-LD；
當文章的 `sections` 構成問答內容時，SHALL 另外輸出 `FAQPage`。

> 這是這個 change 的主要目的：AI 搜尋引用的是「回答問題的內容」而非商品頁，
> 沒有結構化資料，內容再好也拿不到引用。

#### Scenario: 文章頁的結構化資料
- **WHEN** 使用者（或檢索器）取得 `/tea-guide/<slug>` 的 HTML
- **THEN** 頁面含 `Article` 與 `BreadcrumbList` 兩個 `application/ld+json` 區塊，
  且 `Article` 的日期取自 `updatedAt ?? publishedAt`

### Requirement: 文章納入 sitemap 與 llms.txt
`sitemap.ts` SHALL 動態納入 `/tea-guide` 與每篇文章的中英文網址，
`lastModified` 取 `updatedAt ?? publishedAt`；`llms.txt` SHALL 列出文章連結。

#### Scenario: 新文章進入 sitemap
- **WHEN** 業主發布一篇新文章
- **THEN** `/sitemap.xml` 出現該文章的 zh 與 en 兩筆項目

### Requirement: 段落內的自動連結
文章段落 SHALL 自動把手機號碼轉成 `tel:` 連結，並把 `relatedExperiences` 的體驗名稱
連到對應體驗頁。判斷失準時 SHALL 寧可漏連，不可連錯。

#### Scenario: 手機號碼轉成可撥打連結
- **WHEN** 段落出現 `09xx-xxx-xxx` 格式的號碼
- **THEN** 轉成去掉連字號的 `tel:` 連結；同一段出現兩次就連兩次
  ——讀者在哪一段想打都該點得到

#### Scenario: 不是電話的數字不動
- **WHEN** 段落出現時間（`08:00 到 22:00`）、日期（`8 月 22 日到 10 月 11 日`）、
  市話、或沒有連字號的號碼寫法
- **THEN** 原文不變——寧可漏判，也不要讓讀者撥錯號碼

#### Scenario: 體驗名稱只連第一次
- **WHEN** 同一篇文章多個段落提到同一個體驗名稱
- **THEN** 只有第一次出現的位置連到體驗頁，之後維持純文字
  ——整篇滿是連結會讓內文難讀

#### Scenario: 沒有關聯體驗
- **WHEN** 文章未設定 `relatedExperiences`
- **THEN** 段落文字原封不動輸出

