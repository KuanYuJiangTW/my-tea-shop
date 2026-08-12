## 1. Cloudflare AI Crawl Control（dashboard，2026-07-18 已完成）

- [x] 1.1 Security 頁總開關「Block AI bots Scope」改為 Do not block (allow crawlers)
- [x] 1.2 個別放行：Claude-User、ClaudeBot、GPTBot、Google-CloudVertexBot、Meta-ExternalAgent、FacebookBot、Amazonbot（AI Search / AI Assistant 類原本即放行）
- [x] 1.3 維持封鎖：Bytespider、TikTok Spider、Anchor Browser、CCBot、PetalBot、Novellum、Timpibot、Arquivo；Bot Fight Mode 續開
- [x] 1.4 Signals 頁關閉「Managed robots.txt」
- [x] 1.5 外部驗證：抓 production 首頁（403 解除、內容完整）與 robots.txt（無 Content-Signal、無 AI Disallow）

## 2. 程式碼實作（2026-07-18 已完成，尚未 commit）

- [x] 2.1 新增 `src/lib/seo.ts`：`langAlternates()`（canonical + zh-TW/en hreflang）、`jsonLdString()`（轉義 `<` 防 `</script>` 突破）
- [x] 2.2 改寫 `src/app/robots.ts`：AI 爬蟲群組明確 Allow（16 個 UA）、兩群組 Disallow 一致並新增 /admin、/auth/、/account、fallback 網域改 taiwantea.store
- [x] 2.3 新增 `public/llms.txt`：雙語站點摘要（品牌/產品/六種體驗/聯絡/政策，不含價格）
- [x] 2.4 改寫 `src/app/sitemap.ts`：每頁 zh + /en 雙條目含 hreflang alternates
- [x] 2.5 全站 10 個公開頁 metadata 套用 `langAlternates()`；root layout 移除全站 canonical、fallback 網域統一
- [x] 2.6 `experiences/[slug]` 新增 Product + BreadcrumbList JSON-LD（locale 對應、seller `@id` 引用 `/#business`）
- [x] 2.7 首頁 LocalBusiness 加 `@id`；首頁/FAQ/產品列表 JSON-LD 改用 `jsonLdString()`
- [x] 2.8 驗證：`npx tsc --noEmit`（僅既有測試檔錯誤）、`npm run build` 成功、檢查 build 產出的 robots.txt 與 sitemap.xml 內容正確

## 3. 部署與搜尋引擎提交

- [x] 3.1 Commit + push 觸發 Vercel 部署
- [x] 3.2 部署後抽查 production：`/robots.txt`、`/llms.txt`、`/sitemap.xml`（含 /en 條目）、體驗頁 View Source 確認 JSON-LD
- [x] 3.3 Google Search Console 重新提交 sitemap
- [x] 3.4 Bing Webmaster Tools 驗證網站（可由 GSC 匯入）並提交 sitemap（ChatGPT 搜尋使用 Bing 索引）——已匯入驗證，sitemap 成功、0 錯誤、發現 30 網址（含雙語全頁）；後續可看「AI Performance (Beta)」報表追蹤 AI 引用
- [x] 3.5 Cloudflare AI Crawl Control → Agent Readiness「Check your site」跑檢測並處理建議（首掃 21 分；補 Content-Signal + Link 標頭後複掃 29 分、Bot Access Control 100 滿分；API/MCP/Commerce 類扣分屬 agent 經濟基建、與 AI 搜尋無關，列 5.4 評估）
- [x] 3.6 Link 標頭補 IANA 註冊 rel="describedby"（Agent Readiness 認定的 agent-useful 類型）與 rel="sitemap"；DNS-AID 刻意不做——語意為宣告 agent 端點，現無端點、發布即假廣告，留待 MCP server 立案

## 4. 結構化資料強化（需真實資料，不虛構）

- [x] 4.1 體驗頁 Product JSON-LD 加 `aggregateRating`：取自站內評價資料，設輸出門檻（評價數 ≥ 3 才輸出）
- [x] 4.2 向小江取得營業時間、地理座標、品牌社群連結（IG/FB/LINE），補進首頁 LocalBusiness 的 `openingHours` / `geo` / `sameAs`（週一至週日 08:00–18:00；座標與 hasMap 取自 Google Maps「信淳茶居」；sameAs 用 LINE 官方帳號非個人帳號）

## 5. 驗收（部署一週後）

- [ ] 5.1 Cloudflare Metrics：確認 GPTBot、ClaudeBot、PerplexityBot 等出現 Allowed 抓取量
- [ ] 5.2 AI 實測：Perplexity / ChatGPT 問「嘉義梅山 高山茶」「阿里山茶園體驗 推薦」「Alishan tea picking experience」，記錄是否引用 taiwantea.store
- [x] 5.3 抽查 robots.txt 未被 Cloudflare 重新注入：Content-Signal 必須是站方正面宣告 `search=yes, ai-input=yes, ai-train=yes`；若變成 `ai-train=no` 或出現整排 AI 爬蟲 `Disallow: /`，代表 Managed robots.txt 被重新開啟
      ✅ 2026-08-13 覆驗：robots.txt 為 `Content-Signal: search=yes, ai-input=yes, ai-train=yes`，AI 爬蟲無 `Disallow: /`
- [x] 5.4 評估是否立案：產品獨立頁 `/products/[slug]`、茶知識內容策略（GEO 長期槓桿）、預約查詢 MCP server
      ✅ 2026-08-13 覆驗：三項皆已立案（`product-detail-pages`／`tea-knowledge-content`／`agentic-commerce-mcp`）

## 6. 阿里山主題內容（GEO 內容策略第一步，2026-07-19，因阿里山名氣 > 梅山）

- [x] 6.1 新增 `/alishan-tea` 阿里山高山茶指南頁：雙語問答式段落（阿里山茶區範圍、梅山鄉為最大產地約 1,090 公頃、霧抉茶在太興的位置、風味、體驗），Article + BreadcrumbList JSON-LD，誠實區分「阿里山茶區」與「阿里山森林遊樂區」
- [x] 6.2 Footer 導覽、sitemap（32 URL）、llms.txt 納入新頁並強化阿里山敘述
- [x] 6.3 小江把「阿里山定位」FAQ 加入 Sanity 並發布：新增「霧抉茶在阿里山嗎？」（order -2）、「梅山茶跟阿里山茶有什麼不同？」（order -1），並更新既有「體驗地點在哪裡？如何前往？」補上信淳茶居導航、台162甲、公車轉接駁（避免新增重複題）；已用 Sanity API 查證中英文內容皆到位
- [x] 6.4 Google 商家檔案（信淳茶居）：名稱移除關鍵字堆疊（避免違反 Google 名稱政策遭停權）、類別（主類別茶藝館＋茶葉專賣店/賞鳥區）、賞鳥季版描述、網站與社群連結、商品卡（各茶款照實價、避免與官網數字不一致）
- [x] 6.5 修正 Sanity webhook：原本只清 `/experiences` 快取，補上 `/faq`、`/`、`/process`，否則 FAQ 等內容更新後要等 1 小時 ISR 到期才顯示
