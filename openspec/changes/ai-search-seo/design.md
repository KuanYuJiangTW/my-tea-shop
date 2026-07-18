## Context

正式站 `taiwantea.store`（Vercel 部署、Cloudflare 代管 DNS/WAF，free plan）。2026-07-18 盤查發現兩層 AI 封鎖：Cloudflare managed robots.txt 對主要 AI 爬蟲全站 `Disallow: /` 並宣告 `Content-Signal: ai-train=no`；網路層對 AI 抓取器直接 403（連使用者請 AI 即時讀網址都被擋）。程式碼端基礎尚可（SSR、metadata、部分 JSON-LD、robots.ts/sitemap.ts），但缺 llms.txt、英文頁 sitemap/hreflang、體驗頁結構化資料，且 fallback 網域不一致。

站方目標：被 AI 搜尋引用（獲客），同時維持資安防護（admin 2FA、RLS、CSP、Bot Fight Mode 不動）。

## Goals / Non-Goals

**Goals:**

- AI 檢索（AI Search）、AI 助理即時抓取（AI Assistant）、主要訓練爬蟲（AI Crawler）都能完整讀取公開頁面
- AI 能從結構化資料理解「這是誰、在哪、賣什麼、多少錢、怎麼預約」
- 中英文頁面都能被發現與正確歸屬（hreflang）
- 惡意/低價值爬蟲維持封鎖；不增加任何資安暴露面

**Non-Goals:**

- 產品獨立頁 `/products/[slug]`（另案評估）
- 茶知識內容策略／部落格（GEO 長期槓桿，另案）
- 傳統 SEO 排名優化（外鏈、Core Web Vitals 等）
- 付費 AI 曝光（Cloudflare pay-per-crawl 為 Enterprise 功能）

## Decisions

1. **Cloudflare 採「總開關關閉 + 個別爬蟲精細控制」**，而非整批全開。
   - 理由：Bytespider、TikTok Spider（抓取兇猛、不守 robots）、Anchor Browser、CCBot、PetalBot、Novellum、Timpibot、Arquivo 對曝光幫助小，維持 WAF 封鎖；其餘放行。Bot Fight Mode 續開（只擋不自報身分的惡意流量，已驗證的 AI 爬蟲不受影響）。
   - 替代方案：全開（放進低價值高流量爬蟲，否決）；只開檢索類不開訓練類（品牌無法進入模型內建知識，否決——內容為行銷型錄，曝光價值 > 內容保護）。

2. **robots.txt 由程式碼自管（`src/app/robots.ts`），關閉 Cloudflare managed robots.txt。**
   - 理由：版本控制、避免 dashboard 靜默覆寫、不需要 Content-Signal。壞爬蟲本來就不理 robots.txt，真正執法在 Cloudflare WAF——robots.txt 是「告示」，WAF 是「門鎖」，兩者分工明確。
   - robots.ts 對 AI 爬蟲群組明確 `Allow: /`：宣示性，防止未來任何一方誤判。因 robots 規範中「最特定的 User-Agent 群組獨占適用」，AI 群組必須完整複製一般群組的 Disallow 清單，否則 AI 爬蟲會誤入 /checkout 等路徑。

3. **hreflang 雙軌輸出：sitemap `xhtml:link` alternates + 各頁 metadata `alternates.languages`**，集中在 `src/lib/seo.ts` 的 `langAlternates()`。
   - zh-TW 為預設（無前綴）、en 為 `/en` 前綴，與 proxy.ts 的 rewrite 策略一致。不設 x-default（zh 即預設）。
   - Root layout 移除全站 canonical：Next.js metadata 為淺層合併，未宣告 alternates 的頁面會繼承「canonical=首頁」，形成錯誤的重複內容訊號。

4. **JSON-LD 以 `<script type="application/ld+json">` data block 內嵌於 server component**。
   - CSP `script-src` 不約束非執行的 data block，故不需 nonce，與現行嚴格 CSP 相容。
   - 一律經 `jsonLdString()`（`JSON.stringify` 後轉義 `<` 為 `<`）：CMS/DB 內容若含 `</script>` 也無法突破標籤（呼應 docs/security-assessment-2026-07.md 對同類注入的發現）。

5. **體驗頁 schema 選 `Product` + `Offer` + `BreadcrumbList`**，而非 Event/Service/TouristAttraction。
   - 理由：有明確單價（TWD）與供應狀態，Product+Offer 是 Google 富摘要與 AI 解析支援度最高的組合；體驗無固定日期集合，不適合 Event。
   - `Offer.seller` 以 `@id: {baseUrl}/#business` 連結首頁 LocalBusiness 節點，形成跨頁實體圖（entity linking），強化「在地店家」可信度。
   - JSON-LD 內容依 locale 輸出（zh 頁出中文、/en 頁出英文與 /en URL）。

6. **llms.txt 內容原則**：只列公開資訊、雙語、**不含具體價格**（靜態檔避免過期資訊誤導 AI）；價格交給體驗頁 JSON-LD（隨 DB 動態輸出）。

7. **ai-train 開放**為商業決策：行銷型錄性質內容，被模型「記住」的品牌價值大於內容保護需求。

## Risks / Trade-offs

- [Cloudflare 設定被重置（升級方案、誤觸 managed robots.txt）→ 靜默回到封鎖狀態] → 驗收與日常檢查納入「抓 production robots.txt 確認無 Content-Signal / AI Disallow」；spec 明訂偵測條件
- [llms.txt 為手動維護的靜態檔，內容會過期] → 內容原則排除易變資訊（價格、庫存）；新增體驗/產品線時列入更新清單
- [en 頁翻譯仍在進行（i18n 專案 6 tasks 未全完成）→ hreflang 指到的英文頁可能局部仍是中文] → hreflang 本身無害（頁面存在且可讀）；i18n 專案完成後自然補齊
- [開放訓練爬蟲 → 內容進入模型訓練集，不可逆] → 已評估接受；如反悔可隨時在 Cloudflare 重新封鎖（僅影響未來抓取）
- [aggregateRating 需真實評價資料，評價數低時顯示反而減分] → 設定門檻（如 ≥3 則評價才輸出），實作於後續 task

## Migration Plan

1. Commit 程式碼變更 → push → Vercel 自動部署
2. 部署後抽查 production：`/robots.txt`、`/llms.txt`、`/sitemap.xml`、體驗頁 JSON-LD（View Source）
3. Google Search Console 重新提交 sitemap；Bing Webmaster Tools 驗證網站 + 提交 sitemap
4. Cloudflare AI Crawl Control → Agent Readiness「Check your site」跑檢測
5. 一週後：Metrics 確認各 AI 爬蟲有 Allowed 流量；以 Perplexity/ChatGPT 實測品牌與情境問法

**Rollback**：程式碼 revert 單一 commit 即可；Cloudflare 端重新切回封鎖開關（互不依賴）。

## Open Questions

- LocalBusiness 的 `openingHours`、`geo` 座標、`sameAs` 社群連結：待小江提供實際資料（不虛構）
- 產品獨立頁與茶知識內容策略是否立案（GEO 效益最大的下一步）
- Bing Webmaster Tools 用哪個帳號驗證（可從 GSC 匯入驗證）
