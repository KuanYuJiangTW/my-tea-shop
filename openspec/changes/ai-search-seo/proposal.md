## Why

希望陌生人向 AI 搜尋（ChatGPT、Claude、Perplexity、Gemini、AI Overviews）詢問「嘉義梅山高山茶」「阿里山茶園體驗」等問題時，能找到並引用 taiwantea.store。2026-07-18 盤查發現網站正處於「主動把 AI 擋在門外」的狀態：Cloudflare 預設封鎖所有 AI 爬蟲（managed robots.txt 全站 Disallow + 網路層 403），程式碼端亦缺 llms.txt、英文 sitemap/hreflang 與體驗頁結構化資料——AI 完全讀不到網站內容。

本 change 為**反向計畫書**：記錄同日已完成的第一階段（Cloudflare 放行 + 程式碼基礎優化），並規劃剩餘的部署、提交與強化工作。

## What Changes

**已完成（2026-07-18）**

- Cloudflare AI Crawl Control（dashboard 設定，不在 repo）：
  - 總開關「Block AI bots Scope」改為 Do not block
  - 放行檢索/助理/訓練爬蟲（GPTBot、ClaudeBot、Claude-User、Google-CloudVertexBot、Meta-ExternalAgent、FacebookBot、Amazonbot；AI Search / AI Assistant 類全放行）
  - 刻意維持封鎖：Bytespider、TikTok Spider、Anchor Browser、CCBot、PetalBot、Novellum、Timpibot、Arquivo
  - 關閉「Managed robots.txt」，robots.txt 改由程式碼自管
- `src/app/robots.ts`：明確 Allow 16 個 AI 爬蟲；Disallow 新增 `/admin`、`/auth/`、`/account`
- 新增 `public/llms.txt`：雙語站點摘要（品牌、產品、體驗、聯絡、政策）
- `src/app/sitemap.ts`：每頁輸出 zh + `/en` 雙 URL，附 hreflang alternates
- 全站 10 個公開頁 metadata 加上 canonical + hreflang（新增 `src/lib/seo.ts` 的 `langAlternates()`）；root layout 移除誤導性的全站 canonical
- `experiences/[slug]` 新增 Product + BreadcrumbList JSON-LD；首頁 LocalBusiness 加 `@id` 供跨頁 seller 引用
- 全站 JSON-LD 序列化改用 `jsonLdString()`（轉義 `<`，杜絕 `</script>` 標籤突破，呼應 docs/security-assessment-2026-07.md）
- fallback 網域由 `my-tea-shop.vercel.app` 統一為 `taiwantea.store`

**待辦（本計畫剩餘範圍）**

- Commit + 部署上線；Google Search Console 重新提交 sitemap
- **Bing Webmaster Tools 驗證與提交 sitemap**（ChatGPT 搜尋底層使用 Bing 索引，目前僅有 Google 驗證）
- Cloudflare「Agent Readiness — Check your site」跑第三方檢測；Metrics 觀察各 AI 爬蟲抓取量
- 體驗頁 Product JSON-LD 加 `aggregateRating`（取自站內既有評價資料）
- LocalBusiness 補 `openingHours` / `geo` / `sameAs`（待提供營業時間、座標、品牌社群連結後補上，不虛構）
- 上線一週後以 Perplexity / ChatGPT 實測「嘉義梅山 高山茶 茶園體驗」等問法驗收

**評估中（未納入本計畫範圍）**

- 產品獨立頁 `/products/[slug]`（目前 Product JSON-LD 的 url 只能指向列表頁，AI 難以引用單一產品）
- 茶知識內容策略（產區海拔、沖泡方式、品種比較等問答型內容——GEO 長期最大槓桿）

## Capabilities

### New Capabilities

- `ai-crawler-access`: AI 爬蟲存取政策——robots.txt 的 Allow/Disallow 規則、llms.txt 站點摘要、與 Cloudflare AI Crawl Control 的分工界線（程式碼宣示、Cloudflare 執法）
- `seo-structured-data`: 全站 JSON-LD 結構化資料——LocalBusiness/WebSite（首頁）、FAQPage（FAQ）、ItemList+Product（產品列表）、Product+BreadcrumbList（體驗頁），以及防注入的安全序列化要求
- `seo-i18n-discoverability`: 雙語可發現性——sitemap 雙語輸出、全站 hreflang/canonical 政策、fallback 網域一致性

### Modified Capabilities

（無——體驗頁與首頁的 JSON-LD 屬新增的 SEO 輸出需求，歸入新 capability `seo-structured-data`；既有 `experience-detail` 等 spec 的功能行為不變）

## Impact

- **程式碼**：`src/lib/seo.ts`（新）、`public/llms.txt`（新）、`src/app/robots.ts`、`src/app/sitemap.ts`、`src/app/layout.tsx`、首頁/產品/體驗列表/體驗詳細/FAQ/關於/製茶/聯絡/隱私/退換貨共 10 頁的 metadata
- **外部系統**：Cloudflare AI Crawl Control（dashboard 設定，需與程式碼認知同步）、Google Search Console、Bing Webmaster Tools（新增）
- **資安**：放行的是「會自報身分的合規爬蟲」，只讀公開頁面；admin 2FA、session 驗證、RLS、CSP、Bot Fight Mode 均不受影響。`jsonLdString()` 反而消除一處潛在 XSS 注入面
- **風險**：開放 ai-train 代表公開內容可能被用於模型訓練（行銷型錄性質，已評估接受）；Cloudflare 端設定若被重置（例如 managed robots.txt 被重新開啟），會靜默回到封鎖狀態——驗收清單需含 robots.txt 抽查
