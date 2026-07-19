## ADDED Requirements

### Requirement: robots.txt 明確開放 AI 爬蟲並保護私密路徑

`src/app/robots.txt/route.ts`（自訂 route handler，因 Content-Signal 行超出 MetadataRoute.Robots 型別）SHALL 輸出兩組規則：一般 `*` 群組與 AI 爬蟲群組（GPTBot、OAI-SearchBot、ChatGPT-User、ClaudeBot、Claude-User、Claude-SearchBot、PerplexityBot、Perplexity-User、Google-Extended、Applebot、Applebot-Extended、meta-externalagent、Meta-ExternalFetcher、Amazonbot、DuckAssistBot、MistralAI-User），兩組皆含正面宣告 `Content-Signal: search=yes, ai-input=yes, ai-train=yes`、`Allow: /`，且 Disallow 清單完全一致：`/cart`、`/checkout`、`/order/`、`/api/`、`/admin`、`/auth/`、`/account`。

#### Scenario: AI 爬蟲讀取 robots.txt 獲得明確許可

- **WHEN** 任一列名的 AI 爬蟲請求 `/robots.txt`
- **THEN** 其對應的 User-Agent 群組存在且包含 `Allow: /`

#### Scenario: AI 爬蟲群組同樣禁止私密路徑

- **WHEN** AI 爬蟲套用其專屬 User-Agent 群組（robots 規範：最特定群組獨占適用）
- **THEN** 該群組的 Disallow 清單包含全部私密路徑（/cart、/checkout、/order/、/api/、/admin、/auth/、/account），與 `*` 群組一致

#### Scenario: sitemap 指向正式網域

- **WHEN** 讀取 robots.txt 的 Sitemap 行
- **THEN** URL 為 `https://taiwantea.store/sitemap.xml`（由 NEXT_PUBLIC_BASE_URL 決定，fallback 亦為 taiwantea.store）

### Requirement: llms.txt 的 Link 回應標頭

所有頁面回應 SHALL 帶 `Link: <{baseUrl}/llms.txt>; rel="llms-txt"; type="text/markdown"` 標頭（next.config.ts 全站 headers），供 AI agent 從任意頁面發現站點摘要。

#### Scenario: agent 檢查回應標頭

- **WHEN** 請求任一公開頁面
- **THEN** 回應含指向 llms.txt 的 Link 標頭

### Requirement: llms.txt 站點摘要

網站 SHALL 於 `/llms.txt` 提供靜態站點摘要（`public/llms.txt`）：H1 品牌名、blockquote 雙語簡介，以及產品、茶山體驗（六種，含各詳細頁連結）、關於/FAQ/聯絡、政策的分節連結清單。內容 SHALL 僅含公開資訊且不得含具體價格（避免靜態檔過期誤導 AI）。

#### Scenario: AI 讀取 llms.txt

- **WHEN** 請求 `GET /llms.txt`
- **THEN** 回傳 200，內容含品牌雙語簡介、地址電話、全部六種體驗的絕對網址連結，且不含任何 NT$ 價格數字

### Requirement: Cloudflare 與程式碼的分工邊界

AI 爬蟲的實際放行/攔截 SHALL 由 Cloudflare AI Crawl Control 執行（總開關 Do not block、個別爬蟲精細控制、Managed robots.txt 關閉）；robots.txt 僅為宣示。production 的 robots.txt SHALL 與程式碼輸出一致，不得被 Cloudflare 注入內容。

#### Scenario: 偵測 managed robots.txt 被重新開啟

- **WHEN** 抓取 production `https://taiwantea.store/robots.txt`
- **THEN** Content-Signal 行必須是站方的正面宣告（`search=yes, ai-input=yes, ai-train=yes`），且不得出現任何 AI 爬蟲的全站 `Disallow: /` 條目；若出現 `ai-train=no` 或整排 AI 爬蟲 Disallow，表示 Cloudflare「Managed robots.txt」被重新開啟，需回到 AI Crawl Control → Signals 關閉

#### Scenario: 使用者請 AI 即時讀取網站

- **WHEN** AI 助理抓取器（如 Claude-User、ChatGPT-User）請求首頁
- **THEN** 回應 200 並取得完整 server-rendered 內容（非 403 攔截頁）
