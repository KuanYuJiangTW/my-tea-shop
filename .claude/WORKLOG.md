# WORKLOG — session 工作狀態（context 壓縮與斷線的保險）

> 用法：大任務開工先照模板開一節；每完成一項就更新；session 重啟或發現前文被壓縮成摘要時，先讀最後一節再動工。
> 清理規則：超過 10 節時，把「已完成」的舊節各壓縮成一行結論（規則見 playbooks/maintenance.md）。

## 模板（複製這段開新節）
```
### [YYYY-MM-DD] 任務名
- 目標：一句話
- 驗收條件：
  - [ ] 可驗證的條件（不是「做好」而是「npm run test 全綠」這種）
- 待辦：
  - [ ] …
- 決策紀錄：重要決定一行一個（為什麼選 A 不選 B）
- 狀態：進行中 ／ 已完成（證據：指令輸出或 file:line）
```

---

---

### [已歸檔] 2026-07-05 ~ 08-02 的完成工作（12 節壓縮）

> 依 MAINT-4 各壓成一行結論。**完整原文在 git 歷史**（`git log -p .claude/WORKLOG.md`）
> （該次備份已依 MAINT-4「每檔留最近 5 份」輪替刪除）。多數決策細節另存於 `lessons.md`、
> 對應的 `openspec/specs/`、或程式碼檔頭註解。**仍有效的待辦已抽出到下一節**。

1. **[07-05] 建立制度檔案**（Fable 5 建制）— 13 檔制度檔上線，CLAUDE.md 改為路由。
   `.gitignore` 由整包忽略 `.claude/` 改為白名單制；路由表用純文字路徑不用 `@`（會 eager load）。
2. **[07-28] 資安修補（高風險項）** — SEC-001 後台 2FA 可完全繞過等 6 項修畢。
   決策：git 歷史清理暫緩（金鑰已輪換、repo 刻意公開當教材）；
   `validate_admin_session` **刻意保留 anon 權限**——Edge middleware 需要它，收掉會導致後台完全登不進去。
3. **[07-28] 資安清尾（M-3 ＋ L 級 7 項）** — 修補項全數結案，**但 L-3 仍懸著**（見上方未結案區）。**三個「刻意不做」**：
   L-1 不跑 `npm audit fix`（`--force` 會把 Next 降到 9.3.3，不加 force 則改 328 套件修 0 漏洞）；
   L-4 保留 CSP `unsafe-inline`（有 nonce 時瀏覽器會忽略它，
   且**不可照 `openspec/specs/csp-nonce/spec.md` 補 `strict-dynamic`**——會讓 host 白名單失效、GA 與 Cloudflare Insights 掛掉）；
   L-3 PII 到期清除待保單要求釐清（個資法查證結果存於 `src/lib/pii.ts` 檔頭）——**這條不是「刻意不做」而是「等外部答案」**，別跟前兩條一起讀成已定案。
4. **[07-29] session 教訓固化成 hook / command / skill** — `guard-commands.js`（26 案例測試全過）、
   `/verify` command、`reverse-verify` skill。決策：**hook 不是安全邊界，是防手滑的護欄**；
   攔截型 hook 必須先剝離 heredoc 與引號內容再比對，否則會擋住「提到該指令」的正常操作。
5. **[07-29~30] 製茶過程頁多茶款擴充** — `/process` 由單一烏龍擴充為 5 款茶，
   核心敘事＝**炒菁的位置**（最前＝烏龍／無＝紅茶／最後＝紅烏龍）。順手修好 `npm run lint`（補 `eslint.config.mjs`）。
   自承 8 個錯誤，最嚴重是誤讀規格刪掉 6 步店主已確認的溫度時數，**還寫測試把違規釘成正確**。
6. **[07-31] 製茶文案店主二次校對** — 依茶改場資料逐條更正 6 處事實（採摘基準、日光萎凋厚薄、揉捻時間等），
   **不得再由推論改回**。兩條教訓：共通段文案只要出現茶類名稱，就要回頭檢查五款茶是否都成立；
   **不可對 `overflow-x-auto` 容器直接下 `justify-center`**（溢出的左半邊會捲不到），要內層 `w-max mx-auto`。
7. **[08-01] 三個 stacked PR 合併上線** — main `d2fa997` → `5cb9808`。
   **坑**：合併前一個 PR 之後，後續 PR 的 base **不會**自動 retarget，
   必須先手動把 base 改成 main 再合，否則會併進錯的分支、根本上不了線。
8. **[08-01] 超商店到店可用性核實** — OK 超商全面移除（綠界伺服器端回「暫停服務」，正式金鑰實測 8 次），
   可用性收斂到 `src/lib/cvs.ts` 單一事實來源。
   恢復判定：重打電子地圖 API，回應不再是「暫停服務」即可，加回成本是一行。
9. **[08-01] 取消訂單的優惠還原修正** — 兩個真 bug（會員自助取消只退 1% 點數、通用碼永不還原）。
   **核心原則：退還依據是帳本，不是訂單欄位**（`refundOrderPoints` ＝ 已扣 − 已退，順帶帶來冪等性）。
   我的初修依 `points_used` 退是錯的，被線上資料（`points_used=3300` 但帳本只扣 33）推翻後更正。
10. **[08-01] 茶山體驗結帳與取消的點數稽核** — 三個真 bug（取消退點基準、可重複扣點、規格全面過時）。
    **我一度誤判舊制的災難情境並寫進四個地方，被稽核 SQL 的線上實據推翻後全面更正**——實際無真實客人受影響。
11. **[08-01] 體驗預約結案的三項結構性修補** — 逾期取消 cron、待退款對帳提醒、`refundPoints` 補 `expires_at`。
    順帶抓到第四個 bug（場次因人數不足自動取消時完全沒退點）——**漏掉的東西 grep 不到**。
12. **[08-01~02] 風土數位報價頁 v1＋v2** — `/web-design` 與 `/web-design/case` 上線。
    **文案紅線：不得出現編造的客戶成效數字**（公平交易法第 21 條）。
    `web_inquiries` enable RLS 但不建任何 policy，一律走 API route ＋ service_role。

---

### 跨節未結案事項（自已歸檔各節抽出，仍然有效）

- **Supabase Auth 的 preview redirect 白名單未設定** — Vercel preview 上的 Google 登入與 Magic Link
  會被導回正式站。要加 `https://my-tea-shop-git-*-jiangkuanyus-projects.vercel.app/**`。
  程式碼本身正確；**密碼登入不受影響**，preview 要測登入狀態請用密碼登入
- **`tasks.md` 0.5.5**：全 repo 既有 lint error 的批次 B／C 未清（批次 A 已於 PR #3 清償），清冊在 `tasks.md`
- **`tasks.md` 0.5.6**：e2e 要真正接通需五步，現況見 `e2e/README.md`
- **通用碼 `max_uses` 額度虛胖** — 貨到付款改為支援通用碼後會一起消耗，有在跑的活動碼要回頭確認數字
- **`experience_bookings.points_used` 與帳本永久相差 100 倍**（新制 migration 漏了這張表）。
  刻意不 backfill——歷史記錄改寫的風險大於好處，退還一律以帳本為準，該欄只是顯示用快照
- **體驗預約的現金退款仍是純人工** — 取消只寫 `refund_status = "pending"`，實際退錢要人去綠界後台操作，
  再回後台 PATCH 成 `processed`；沒有對帳機制（僅有超過 3 天的摘要提醒信）
- **風土數位待小江**：LINE 圖文選單補上案例頁與 `#faq` 兩格連結；提供 GA 數據以填案例頁成長數字
- **環境限制**：本容器網路政策擋掉 `*.vercel.app` 與 `taiwantea.store`（proxy 回 403），
  agent 無法抽查線上頁面，要驗頁面內容請用本機 `npm run build && npm start` 打 localhost
- **next-intl 把整份 `messages/*.json` 序列化進每一頁 HTML**（每頁 70–110KB），
  全站既有行為、不影響正確性，日後若要優化可考慮 messages 分割
- **設計系統的三組 AA 對比不足是業主拍板的已知取捨，不是待修缺陷**（第四波做完、
  第六波依小江決定全數回退）。動色彩前先讀 `docs/design-system.md`，**請勿自行「修正」**
- **三種線上金流的組合下單從未實測** — `online`（綠界）／`stripe`／`paypal` 各 0 筆。
  它們與貨到付款不同，是**付款成功後**才扣庫存，目前只有單元測試覆蓋
- **訂單資料池還沒清乾淨** — 22 筆已取消的訂單（19 筆是 2026-03 的貨到付款）業主 2026-08-15
  確認是他自己測試，但**尚未標記 `is_test`**；那 22 筆來自 8 個 email，與「已付款」6 筆的
  3 個 email **有 2 個重疊**，真實客人可能只有 1 個。
  **在業主逐一認過之前，任何 AOV／轉換率的數字都不可引用**
- **商品照片缺兩款**：紅烏龍茶、四季春。同時影響商品頁外觀（只有漸層底色、無 fallback 圖）
  與結構化資料（`product-jsonld.ts` 會**過濾掉無圖商品**——硬塞品牌圖等於謊報商品外觀）
- **東方美人卡在缺成本**（要當價格錨點），尚未上架
- **Merchant listing 的 `hasMerchantReturnPolicy`／`shippingDetails` 仍缺**（GSC 列為 warning）。
  刻意不填：要填得正確需要真實運費與退貨天數進機器可讀欄位，寫錯比不寫傷害大。
  建議連同商品獨立頁（openspec 5.4 `/products/[slug]`）一起做，那也是「五筆商品共用同一個
  url」的真正解法
- **商品詳情頁（`product-detail-pages`）未做**；商品評價區因此暫掛 `/products`，做好後搬過去
- **`openInExternalBrowser()` 的 iOS 分支無效** — 非 Android 只做 `window.location.href = url`
  （同一網址），會觸發整頁重載但跳不出 LINE 的 in-app browser，推論會反覆重載。
  **本環境無法實證**（UA 覆寫活不過重載），需真 iPhone 從 LINE 對話點連結確認。
  建議改成「不自動跳，直接顯示橫幅教他用選單開啟」
- **`src/app/account/bookings/[id]/participants/page.tsx` 整頁沒有翻譯** — import 了 `useLocale`
  但 11 處 UI 文案全是寫死中文。noindex 不影響 SEO，但英文客人訂了體驗之後會遇到一張全中文的表單
- **體驗季節排序 3.3／3.4 未做**：季節外的「本季已結束・明年見 ＋ 留 Email 通知我」。
  徽章已會顯示 ended／upcoming，但預約按鈕停用與 Email 登記入口沒做。
  登記名單**要與開課請求的需求蒐集共用同一張表**，兩邊一起做比較省
- **體驗季節排序 4.4 未做**：商品排序的後台 UI（欄位與查詢都好了，但後台商品頁是 1,035 行的
  單一 client 元件）。現在要調商品順序可直接改 Supabase 欄位
- **Vercel 舊 LINE 環境變數待刪**：`NEXT_PUBLIC_LINE_OFFICIAL_URL`、`NEXT_PUBLIC_LINE_ADD_URL`
  （留著無害，只是雜訊；新名字見已歸檔 08-22 那條）
- **Google 商家「梅山太興村賞黃頭鷺景觀平台停車場」**：貼新說明、網站欄位設成
  `/experiences/cattle-egret-tour`（**說明欄不可放網址**，Google 政策）
- **開課申請的採茶與紅茶職人仍關著**（`accepts_requests = false`）：9/10 前後看實際茶況再開。
  理由見已歸檔 08-24 那條——按季節窗核准 → 客人付款 → 茶菁沒到位 → 要取消一筆已付款的預約
- **開課請求的三個已知風險**：(1)「兩個工作天內回覆」印在四個頁面上，排程每天寄積壓提醒，
  天天來就會被忽略；(2) 48 小時核准連結會鎖住時段，同時多筆待付款時月曆會有一段
  「看起來有空、其實不能排」；(3) **萬鷺朝鳳的機會成本**——核准一筆 3 人（1,350）會在
  該時段開私人場次，衝突檢查會擋掉同時段再開公開場（上限 20 人 × 450 ＝ 9,000）。
  20 場公開場次報名數全是 0 時只是理論值，**真正要小心的是季節後段媒體報導後的那幾天**
- **LINE 轉換代碼 `_lt('send','cv',...)` 刻意沒做**（現在裝只會得到永遠是 0 的數字）。
  觸發條件：開始投 LINE 廣告、或好友數到數百人、或要驗證漸進式訊息成效。
  屆時作法：抽 `trackLineConversion(tradeNo, amount)`，三條成功路徑（綠界 `RtnCode==="1"`／
  `stripe=success`／PayPal 等 capture 回來）各自在確定成功後呼叫，用交易編號寫 localStorage
  冪等鎖，預約（`B` 開頭）與商品訂單分開標記。送金額給第三方前，隱私權政策要再補明確一句
- **`next build --webpack` 會失敗（型別檢查），Turbopack 不抓** — `api/ecpay/cvs-map/route.ts`
  匯出 `createSignedTradeNo`／`verifyTradeNo` 兩個非路由函式，而 `cvs-callback/route.ts:3`
  直接 `import { verifyTradeNo } from "../cvs-map/route"`。2026-08-31 實查**兩處都還在原狀**
  （08-12 記的「已開背景任務待處理」那個任務早就沒了）。日常 build 走 Turbopack 不受影響，
  但這是把非路由匯出放進 route 檔的既有債，修法是把兩支函式抽到 `src/lib/`
- **L-3：PII 到期清除待保單要求釐清**（07-28 資安清尾唯一沒結案的一項，個資法查證結果存於
  `src/lib/pii.ts` 檔頭）。它不是「刻意不做」，是等外部答案
- **三個舊分支已全數併入 main，可刪**：`feat/product-reviews`、`feat/register-line-oauth`、
  `feat/register-facebook`（2026-08-31 以 `git merge-base --is-ancestor` 逐一驗證）


### 業主已經否決過的，不要再提

這些是**看過實物之後**的決定，不是還沒試過：

| 提案 | 結果 |
|---|---|
| Hero 主 CTA 換色（米白實心／暖色相） | 做上線 → 業主看實物判定「改完變難看」→ **已還原成綠色** |
| Hero `h1`／tagline 換價值主張 | 同上一併還原，tagline 維持「源自台灣高山」 |
| Hero 遮罩左側加深到 80% | 業主覺得太重 → 已改為**左半維持 55%、右半漸淡到 20%** |
| 公告條註冊連結的 19px 觸控區 | 業主指示**維持不修** |
| 首頁三張卡換成紅烏龍 | 業主決定不換 |
| 品飲組上首頁 | 業主決定不上，只在 `/products` |
| 蜜香紅茶／茶包調價 | 業主決定**維持現價**（蜜香紅茶 400、蜜香紅茶茶包 250、四季春茶包 250） |
| 商品卡顯示星等 | 實測會多 32px 撐破 632px（業主指定值），走退路改在顧客回饋區呈現 |
| 體驗 9 折做成線上自動折抵 | 刻意不做，改人工給（理由見已歸檔 08-21 那條） |

**`ProductCard.tsx` 的卡片總高 632px 是業主指定值**，卡內 6 處間距早在 08-12 為了
描述第三行各縮過 2–4px，最多再擠出 22px。動它之前先量，並先問業主。


### 這個專案在數字上的實況（給任何要談優化的人）

- 真實已付款訂單極少（個位數），且**可能全是測試**。不要拿站上的統計推論客人行為
- 免運門檻國內 1,000／國際 2,500；宅配實收成本是黑貓「3 斤以下・本島」130，
  售價設 150。**3 斤 = 1,800g = 9 包 150g 散茶**，也就是九包以內同一筆運費
- 各品項毛利率（業主 2026-08-13 提供斤價換算）：紅烏龍 60%、高山烏龍 59.4%、
  金萱 53.6%、蜜香紅茶 50%、四季春 45%（已從賠錢的 8.3% 調到 250）
- **75g 的毛利率一律比 150g 高 6–7 個百分點**（價格 60%、茶葉成本 50%）
- **茶包代工成本已知 96–108**（業主提供）；東方美人的成本仍未提供，見上方未結案區
- **`payment_method` 不能用來判斷國內外**（台灣人也用 PayPal，用它算出海外 39%、實際 3.6%）。
  `orders` 沒有 `delivery_type` 欄位，正確依據是 `shipping_address->>'country'` 與 `->>'type'`

---

### [已歸檔] 2026-08-03 ~ 08-24 的完成工作（20 節壓縮）

> 依 MAINT-4 各壓成一行結論。**完整原文在 git 歷史**（`git log -p .claude/WORKLOG.md`）
> 與備份 `.claude/backups/WORKLOG.md.20260831.bak`。多數決策細節另存於 `lessons.md`、
> 對應的 `openspec/specs/`、或程式碼檔頭註解。**仍有效的待辦已抽到上面三區**。

1. **[08-03~07] 設計系統十一波**（`6951084` … `8831c23`）— 字體收斂、色彩語意 token
   （**token 必須平台無關**：決策存在 CSS 變數層 `--radius-card`，元件只引用語意名，
   將來導 React Native theme 才帶得走）、非顏色 token 軸、`docs/design-system.md`、
   favicon、**後台 hex 收斂 746 → 28（-96%）**、字級尺度與首頁節奏、淺底收斂成兩層、
   門面四件打磨。**深色模式只留欄位不實作**（0 個業務元件支援 `dark:`，真實需求只有
   「後台清晨看單」）。AA 遷移做了又全數回退，成為已知取捨（見上方未結案第一條）。
2. **[08-11] 英文版漏翻（會員中心預約／點數、結帳 order summary）** — 四個根因分類，
   同類問題照這四類找：DB 有英文欄位但沒取用／硬編碼中文／日期寫死 `zh-TW`／DB 沒有英文欄位。
   **等級名稱一律不讀 DB 的 `name`**（改由 tier id 對 `common.memberTier.*`）；
   **帳本描述走顯示層對照表**（不改寫入端，可涵蓋歷史資料；認不出來的原樣顯示原字串）。
   測試**掃描原始碼**抓所有寫入 `description` 的字面值比對對照表，漏補會紅並指名檔案。
3. **[08-12] 轉換動線的信任訊號＋運費修正＋定價盤點**（`8cd73ba`）— 宅配運費 250 → 150
   （**250 是黑貓「15–30 斤」費率**，實際出貨幾乎都在 3 斤以下）；**四季春原本賠錢賣**
   （進價 550／斤、售 150 → 毛利 8.3%，扣包材金流是負的），已調 250；規格 chip 只在
   庫存 ≤10 顯示；`orders.is_test` 欄位＋trigger（排除 95 筆業主測試單）。
4. **[08-13~15] 品飲組（tasting-set）＋後台組合管理** — 三款 75g ＋手提袋 650，不做禮盒
   （禮盒包材 175–210 是四包茶葉成本的一半以上，要賣 1,200 才對得齊，反而跳過訂單空缺帶）。
   **定價 650 的理由是免運算術**：`650 ＋ 金萱 350 ＝ 1,000`，加購變成一句不用解釋的算術。
   **原子性放在 DB 不是應用層**：`decrement_bundle_stock` 單一交易逐一扣，任一成分不足
   即 `RAISE` 整組回滾（刻意不用 `return false`，那樣前面已扣的會留下來）。
   順手修掉 `/api/orders` 扣庫存後建單失敗**不回補**的既有缺陷（`rollbackStock()`，
   只補 `data === true` 的項目）。購物車合成 id 解碼收斂進 `lib/cart-item-id.ts`
   （`10000+`＝75g、`20000+`＝茶包、`30000+`＝組合）——**那些數字已在客人的 localStorage 裡**。
5. **[08-15] 商品評價（product-reviews）階段一＋二** — 已上線，目前 8 則（7 則可見）。
   **商品卡刻意不放星等**（實測三個斷點固定 +32px，撐破 632px，理由已寫進 `ProductCard.tsx`
   註解，**不要再試一次**）；「訂單含此商品」把**組合展開比對**（買品飲組的人真的喝過那三款）；
   重複留評靠 DB 的部分唯一索引，不先 select 再 insert（併發下兩個請求都會查到「沒有」）。
6. **[08-15] 註冊頁補 LINE 登入＋抽 `SocialAuthButtons`**（`3ec3ca1`、`0aaf544`，已在 main）—
   LINE 的配套（內建瀏覽器偵測、跳轉、fallback banner、翻譯鍵）全都在，**缺的只是按鈕**。
   順手修掉 en bug：`callbackUrl()` 原本比錯對象，英文使用者登入後被導去中文版 `/account`。
7. **[08-15] 移除 LINE 行動裝置警告彈窗**（`42727c2`）— 考古證明它的成因（Android 跨瀏覽器
   失聯）早被 `0e8c4d4` 的「自動跳外部瀏覽器」順帶解決，彈窗晚一個月才被解決卻沒跟著撤，
   是**殘留貼紙**；且橫幅說「Google 登入將無法使用」、彈窗說「建議改用 Google」互相矛盾。
8. **[08-15] 註冊頁開放 FB ＋ 預約／候補的 email 防線**（`c32f26c`、`0a018f0`，已在 main）—
   FB 只給 `public_profile` 不給 email：`bookings` 撞 NOT NULL 變 **500 硬失敗**、
   `waitlist` 存空字串**靜默失效**（遞補通知寄到空信箱且不報錯，這條最危險）。
   兩處改成 400，前台改為導去會員中心綁定 Email。反向驗證已做。
9. **[08-17] `/en` 前綴的三處漏洞**（`f36bbf9`、`8bf696a`）— **根因同一個**：`/en/*` 由
   `src/proxy.ts` 內部 rewrite、**沒有 `[locale]` 路由段**，凡拿 `pathname` 判斷的邏輯
   都得自己處理 `/en`。(1) **`/en/admin/dashboard` 未登入回 200**，HTML 含 32 筆金額
   （API 層倖免，25 條有 23 條套 `withAdminAuth`）→ 全面改看 `routePath = rewritePath ?? pathname`；
   (2) 每個英文頁的 canonical 都宣告「正式版本是中文頁」→ 改 self-canonical ＋ `x-default`，
   10 個頁面的靜態 `metadata` 改成 `generateMetadata`；(3) robots.txt 收斂成**只封鎖 `/api/`**，
   排除索引一律交給頁面自己的 `noindex`（`/waitlist`、`/experiences/booking/` 從來沒被擋過）。
10. **[08-17] 合併上線與線上驗收**（`2303bc8` → `bdc9aa1`）— production 實測全過。
    **踩到 Vercel 單次 webhook 漏接**：push 上 main 後完全沒產生部署（不是快取也不是失敗，
    清單裡根本沒那筆），推空 commit 重新觸發才上線。
11. **[08-17] 英文頁 metadata 雙語化** — 10 個區塊進 `messages/` ＋新 `siteMeta` namespace。
    途中發現 **Next 的 metadata 是淺層合併**：子頁一旦宣告 `openGraph`，root layout 那整個
    物件就被取代 → 全站 `og:type`／`og:locale`／`og:site_name` 早就沒輸出。抽出
    `openGraphFor()`（`src/lib/seo.ts`），所有宣告 og 的頁面一律用它組。
    `metadata-bilingual.test.ts` 43 條釘住（en 不得含中日韓字元、zh 必須含中文，防貼反）。
12. **[08-18] 要求索引前的最後三項** — 英文頁圖片 `alt` 改讀 `nameEn`（**接線沒接上，
    不是缺文案**）、Article 的 author／publisher 補 name、sitemap 補 `x-default`。
    **建議不動的五項**：中文品名並列是刻意的雙語設計、中文 UGC 不譯（翻譯等於偽造評價）、
    footer 中英並列、sitemap `lastmod` 同值、`aria-label` 另外排。
13. **[08-18] `aria-label` 的中文也修掉** — 新增 `common.a11y` 7 鍵、改 13 處。
    **`LanguageSwitcher` 刻意不改**（每個標籤用它的**目標**語言是語言切換器的標準做法），
    已寫進測試例外名單，並附一條「名單裡的字串必須還存在」防止它腐爛成免死金牌。
14. **[08-21] 體驗季節排序上線**（`feat/experience-seasonal-ordering`）— 排序鍵
    `(釘選中, 季節中, sort_order, id)`，集中在 `src/lib/experience-ordering.ts`。
    **不能改 id**（三張表以外鍵指著 `experience_types.id`）；季節區間與開課申請共用
    `experience_availability_windows`；**釘選用 `pinned_until DATE` 而非 BOOLEAN**
    （沒有到期日的置頂將來一定會忘記撤下）。**實跑才抓到的缺陷**：`.order("sort_order")`
    在欄位還沒建好時會讓商品列表**整個變空**（PostgREST 對不存在的欄位排序是整個查詢
    失敗 42703，不是忽略排序），已改成兩段式 fallback，`ordering-fallback.test.ts` 守住。
    後台重排一度把季節造成的第一名固化成 `sort_order=10`，已改成「唯讀的實際順序」＋
    「可編輯的手動順序」兩區（`49b8c33`／merge `4bb62ed`）。
15. **[08-21] 同日加購的交叉銷售區**（`ff95b0a`，已上線）— 詳細頁月曆後、評價前，
    自動濾掉「季節未開始／已結束」的體驗（**推一個訂不到的東西比不推更糟**）。
16. **[08-22] LINE 環境變數改名**（`8f395d6`／merge `0877aa5`）— 體驗頁的「用 LINE 問同日安排」
    接到**風土數位**帳號，霧抉茶的諮詢入口等於斷的。根因不是手滑是命名：`OFFICIAL`／`ADD`
    看不出屬於哪個品牌 → 改為 `NEXT_PUBLIC_LINE_TEA_URL`（霧抉茶 @976jhznk）與
    `NEXT_PUBLIC_LINE_TERROIR_URL`（風土數位 @580ariqa），註解一律寫上帳號 ID。
    生產實測 `curl -L` 解出最終網址正確。**`NEXT_PUBLIC_*` 是 build 時內嵌**，
    改名而環境變數沒先加，按鈕會**靜默消失**（三處都是 `lineUrl && ...` 才渲染）。
17. **[08-23] 店名確定為「信淳茶居」** — 地圖店名、Google 商家停車場說明欄、
    `src/app/page.tsx:49` 的 `alternateName` 三處一致，本項結案。
18. **[08-23] LINE 官方帳號（@976jhznk）建置＋ LINE Tag 上線**（`fceb1f3`／merge `faebbac`）—
    8 則關鍵字回應＋圖文選單 v1（賞鳥季）／v2（平常）。**LINE 的關鍵字是「完全一致」比對**，
    文字欄只能填單一關鍵字，填「4 交通地址」這種組合會全部落空。v2 的選茶指南連
    `/alishan-tea`**不是 `/tea-guide`**（後者只有 `[slug]`、沒有索引頁，會 404）。
    `LineTag.tsx` 的 `customerType` 必須是 `'account'`（`'lap'` 是廣告平台用的，
    填錯不報錯、pv 照送，但 LINE 端不認資料）；CSP 加 `d.line-scdn.net`／`tr.line.me`。
    **對外時間定案**：現場（信淳茶居）每日 08:00–18:00，文案一律附「上山前先傳個訊息」
    （茶園的人可能在山上，寫死時間會讓客人白跑 50–60 分鐘山路）；LINE 回覆每日 08:00–22:00。
    **用詞：講地點用「現場」不用「門市」**（購買情境裡既有的「門市」用語維持不動）。
19. **[08-23] 客製開課請求完整版**（`feat/open-class-request-data`，91 項）— 7 狀態 CHECK、
    `request_no` 給人看／`token` 給機器認、客人端查詢**用白名單 select 不用 `select("*")`**
    （新增欄位不會自動外洩 `admin_note`）、私人場次靠 `visibility` 不進公開月曆（帶 42703
    兩段式 fallback，SQL 沒跑也不會讓月曆開天窗）、**`convertRequestOnPayment` 整段包在
    try/catch 裡、永不 throw**（它跑在綠界回調裡，爆掉會讓綠界收不到 `1|OK` 而重送）。
    **需求標記的門檻是 2 人不是 1 人**（「只有你想」是負面社會證明，會降低附議意願）。
    **等鳥茶席開新的一款、不做加購**（加購要動 booking schema 的品項／金額／退款分攤，
    是一整套子系統；而實際賣的是不同行程）：250 元／1.5 小時 vs 650 元／4 小時。
20. **[08-24] 客製開課請求上線＋逐款開關**（PR #8，merge `27579bd`；急件加價撤銷 `1b6d798`）—
    開關是資料庫欄位 `experience_types.accepts_requests`，**不需要改程式或重新部署**；
    關掉的款式前台自動退回 Phase 0 的輕量登記，需求照樣收得到。
    **紅茶職人門檻 6→4 的理由**：門檻太高的症狀是**零申請**，而零會被讀成「沒需求」，
    **這種錯誤沒有訊號**，所以寧可先放低。要更精準地擋日期用 `experience_blackout_dates`
    （整款關掉是鈍器）。

---

### [已歸檔] 2026-08-25 ~ 08-31 的完成工作（8 節壓縮）

> 2026-09-04 依 MAINT-4 壓縮（壓縮前 11 節，超過 10 節上限）。**這 8 節的工作都已合併上線。**
> 完整原文在 git 歷史（`git log -p .claude/WORKLOG.md`）與 `.claude/backups/WORKLOG.md.20260904b.bak`。
>
> **壓縮時抽出去別處的東西**（不是刪掉，是搬到會被讀到的地方）：
> - **業主原話與已確認事實** → `docs/owner-source-quotes.md`（新建）。紅茶製程逐字原話、
>   賞鳥場地哪些建築不是自家的、付款方式、功勞歸屬、鳥況回報立場、待確認的兩項。
>   `copy-guardian` 的掃描範圍已把它列為比對基準。
> - **預覽窗格 hidden 會關掉 IO／scroll 事件／既有元素樣式重算** → `diagnosis.md` 環境事實表
>   （擴充既有那條 `visibilityState` 規則，不另開新條）。
> - **三條重複踩到的坑** → `lessons.md`：`no-cascading-renders` 與 `useSyncExternalStore`（踩 3 次）、
>   `-core.ts` 切法（踩 2 次）、next-intl 序列化造成的 grep 假陽性（騙 2 次）。
> - **仍未結案的待辦** → 併入本檔最後一節的「還沒做的」（session-start hook 只讀最後一節）。

1. **[08-25] 賞鳥季 SEO 上線**（PR #9／#10，已併 main）— `faqPageJsonLd()`／`seasonalEventJsonLd()`、
   攻略文 FAQPage、體驗頁 Event、首頁季節條帶、sitemap 補 `/tea-guide`。
   **FAQPage 的判斷規則只有一條：小標以問號結尾**（想排除就拿掉問號，不必改程式）。
   正式站實測中英各 6 個 Question、1 個 Event。Sanity 標題／摘要／`seoDescription`／英文小標
   由業主與 API 分工改完，用 `ifRevisionID` 樂觀鎖。**更正 8/23 的推測：webhook 沒有壞**，API 改完立即生效。
2. **[08-25] `/tea-guide` 列表頁根本不存在**（PR #10）— 送索引遭拒 → curl 一看是 404。
   每篇文章的 BreadcrumbList 第二層一直指向它，長期對 Google 宣告一個不存在的網址且不報錯。
   **986 測試、tsc、lint、build、`next start` 全綠，沒有一種驗證會去問「這個路徑有頁面嗎」。**
   補頁而不是移除 sitemap 條目——麵包屑已宣告它存在，移除只是把問題藏回去。
3. **[08-25] 綠界測試模式驗完**（`52020f6`，已併 main）— 業主用測試信用卡實際結帳成功。
   防護在**程式層不是設定層**：`ECPAY_STAGE = ECPAY_MODE === "stage" && !isVercelProduction`，
   正式環境誤設也會被忽略並印 error。「賞鳥季真實客人付不了錢」的風險已不可能發生。
4. **[08-25] 紅茶 3 小時場文案改對**（業主原話→`docs/owner-source-quotes.md` §1）—
   四道工序客人只做兩道、交付是**寄送不是帶走**，舊文案三處與事實不符。已改
   `src/lib/experiences.ts` 的 `FALLBACK_CONTENT`、`public/llms.txt`、Sanity，
   並加 `tea-making-copy.test.ts` 釘住。1,000 元／6 人的提案**未採用**，維持 800／4（理由見該檔 §1.4）。
   踩到的坑：`sanityFetch` 有 1 小時快取，本機 `SANITY_WEBHOOK_SECRET` 與線上不同步（手動清快取回 401），
   要立刻生效就去 /studio 按 Publish。
5. **[08-26～27] 首頁 hero 三張輪播**（PR #12，已併 main）— 業主看實機來回調了很多輪。
   五個要點：(a) **遮罩不能拿掉，控制項不能跟照片借對比**——文字區同時有米白與深色底，
   沒有單一文字色活得過兩種底；控制項改**雙描邊**（對自己描邊，不受背景影響）3.31／3.70／4.78 全過。
   (b) 滿版 hero 的可視範圍由 `object-cover` 決定，「換完整檔案」是錯的直覺（4:3 原檔反而切更多）。
   (c) **`--hero-chrome` 有三個觸發來源缺一不可**，只掛 ResizeObserver 會出事（公告條 dismiss 要延一個
   macrotask，不能用 rAF）。(d) 手機垂直節奏照語意分組排（12/28/8/32）不是等比縮小。
   (e) 縮小按鈕與加滑動是同一件事的兩半。
   **已知限制（都已接受）**：計數器對比不合格（透明底只靠 drop-shadow）、WCAG 2.2.2 只剩鍵盤 focus
   可暫停（業主指定對齊參考站）、第三張 2000px 撐不住 retina、320px 會斷行。
   **素材：`20260427_103350` 必須保留**——它是第二張 `wilting4.jpg` 的未裁切原檔，日後要再調取景得靠它。
   撤掉的方案連同量測數據都在 commit 訊息裡（`d42f9f6`…`c447f28`，索引見壓縮前原文）。
6. **[08-27] 茶葉小幫手全站 503**（PR #13，已併 main）— 不是額度也不是 bug：硬編的
   `llama-3.3-70b-versatile` 被 Groq 下架，404 被 catch 統一吞成 503。改成 `CHAT_MODEL`（env 可覆寫）。
   **關鍵教訓：`GET /api/chat` 原本回硬編 `{ok:true}`，是一盞永遠不會紅的燈**，這次故障它一路回綠，
   只能靠客人回報才被發現。已改成真的查一次 `/v1/models`，並反向驗證過（設成下架模型會回 503）。
   同批 `lessons.md` 照 MAINT-4 精簡 31→16 條（PR #14）。
   順手處理掉的風險：`.env.local` 備份到 `.claude/backups/`（**已追蹤目錄**）差一步就進 commit，
   已刪並加 `.claude/backups/env*` 忽略規則。
7. **[08-30～31] 賞鳥攻略頁轉換優化三批**（PR #17，已併 main 到 `8ccec91`）—
   起點實測：頁高 5,968px、**圖片 0 張**（賣視覺奇景卻整頁沒有一隻鳥）、全文連結 1 個且在 80% 捲動深度、
   電話出現 3 次可點 0 次、內文對比 3.65。**瓶頸不在導覽頁在攻略頁——好貨在後面，門很小又很淡。**
   第一批：`article-links.ts` 在算繪層認出電話與體驗名稱（**體驗名稱全文只連第一次**，兩次都連會像置入）、
   對比修到 4.80、底部整寬雙鍵、`/tea-guide` 不掛公告條。連結 1→6、第一個出口 80%→25% 深度。
   第二批：**鳥的素材全部是影片，靜態圖都是截圖**——萬鷺朝鳳靜止時只是綠山上的白色雜訊。
   首屏改播影片是效益最大的一項。直式 4K 裁 16:9 等於放大構圖（並排實測過）；
   **不要加 WebM**（VP9 crf36 產出 4.1MB，H.264 crf27 只有 1.5MB——鳥群是上千個高頻小點）。
   版位對照表放 `src/lib/tea-guide-media.ts` 而非 Sanity，因為 **Sanity 寫入即上線會繞過 PR 審閱**。
   素材清理：業主上傳的 1.9GB 原始素材放在 `public/` 底下等於公開下載，已依指示全刪，1870MB→69MB。
   第三批：目錄、季節倒數、同日第二體驗 9 折、浮動底部 CTA。浮動 CTA 用 `--floating-cta-h` 讓
   ChatWidget 自己讓位，**兩個元件不必互相知道對方存在**；IO 只做**單向**切換（雙向切會在頁尾又冒出來）。
   後續業主實機回報「太慢才出來」，改成以**螢幕高**為單位（1.5 螢幕）而非文章比例——
   文章變長時比例換算成絕對距離會漂移。
8. **[08-31] 賞鳥文案盤點**（PR #18，已合併）— 抓到 `public/llms.txt` 把導覽價格寫成
   **250 元（實際 450）**。那是專門餵 AI 檢索器的純文字檔，`tsc`／`lint`／`build` 一個都抓不到。
   站上其他每一處都是 450。新增 `egret-copy.test.ts`（8 條）釘住並已反向驗證。
   同批用 write token 改了 5 處 Sanity 內容（付款方式、兩地點條件分開講、功勞歸屬、tagline、`updatedAt`），
   每次都先比對原文一字不差並用 `ifRevisionID` 鎖版本——**事實本身已存進 `docs/owner-source-quotes.md`**。
   **流程違規的善後**：我為了寫 WORKLOG 直接在 main 上 commit＋push（`da52f0a`），已 revert，
   教訓在 `lessons.md`——**會自我豁免的正好都是「只改文件」這類看起來無害的變更**。

---

## 2026-08-31 對照八層成熟度手冊做全站盤點，並補完第 3–5 層

分支 `chore/maturity-level4-5-upgrades`，四個 commit（`09f57af` → `5c7ba27`），已推送未合併。

### 盤點結論

八層裡前三層（下好指令／CLAUDE.md／OpenSpec）本來就強，**第 6 層 MCP 是最大缺口**
（本機 MCP 0 個、plugin 0 個）。形狀是「規範與規格做得極好，但沒接上執行力」——
規則靠自覺、線上狀態靠人工查、重複流程靠敘事傳承。
網頁版盤點：https://claude.ai/code/artifact/19849a9d-bcd1-4332-bae8-9032a2cad0d2

### 做完的七項

1. **四個 subagent 全開 `memory: project`**。`memory` 欄位已向官方文件查證（值 user/project/local，
   存 `.claude/agent-memory/<name>/`）。`.gitignore` 的 `.claude/*` 是黑名單制，
   白名單漏加 `agent-memory` 會靜默忽略——已補並用 `git check-ignore -v` 複驗。
2. **main 分支護欄**（guard 第三條規則）。測試 26 → 46 案例。逃生口是 `ALLOW_MAIN=1` 前綴，
   豁免必須寫在指令裡看得見。
3. **SessionStart hook**：開場自動報分支、WORKLOG 最後一節的待辦、`gh` CLI 有無。
   **本機 `gh` 是可用的**——CLAUDE.md 那句「沒有 gh」講的是 web 容器。
4. **新增 `tester` 與 `copy-guardian`**，dispatch.md 的 DISP-1 與 DISP-6 同步更新。
5. **GitHub Actions CI**（`.github/workflows/verify.yml`）：測試、型別、lint，
   外加跑 `guard-commands.test.js`（它被 vitest exclude）。刻意不含 build，理由寫在檔內註解。
6. **`deploy-check`（帶腳本）與 `contrast-audit` skill**。前者對正式站實跑 8 項全過，
   並用必定不存在的字串反向測試確認會紅且 exit 1。
7. **每週正式站健檢排程**（週一 09:03，taskId `taiwantea-weekly-healthcheck`）。

### 順手查證的線上事實

正式站 `llms.txt` 目前**是對的**：450 元、無 250、兩個賞鳥地點的設施條件有分開講。
`robots.txt` 的 Content-Signal 與 AI 爬蟲 Allow 群組都在。

**但發現一句待確認的宣稱**：`llms.txt` 賞鳥那行寫「賞鳥的起點就是**自家的**茶居與停車場」。
依 auto-memory 的 `project_egret_venue_facts` 與 8/31 的歸屬更正，景觀平台停車場
恐怕不是自家的。這需要業主原話（JUDG-11），**我沒有動它**。

### 第 4 項：提案分流，以及它挖出來的 OpenSpec 結構問題

動手歸檔 `tasting-set` 時 `openspec archive` 直接中止。追下去發現主 spec 樹有系統性問題：
**`openspec validate --specs` 是 3 通過、45 失敗**——缺 `## Purpose` 與 `## Requirements`
區段，其中 37 份還帶著 `## ADDED Requirements` 這種只該出現在 delta 的標題
（歷次歸檔把 delta 原樣搬進主 spec 留下的）。**不是沒人整理，是工具讓人歸檔不了。**

我原本給 OpenSpec 90 分是數檔案數得出的，沒驗規格本身；下修到 55、修好後回到 85。
順帶修正：先前說「39 個歸檔」是目測估的，起點實際是 35（`git ls-tree 058f5e1` 核對）。

做了：
- 腳本一次遷移 48 份，**需求內文一字未動**（逐檔比對 HEAD，需求數與情境數全部不變）
- 12 條需求補 RFC 2119 關鍵字。**驗證器只讀需求的第一行**當 text——有兩條其實寫了
  SHALL 只是位置在後面，把該句提前就過
- 補兩處缺漏的 scenario；更正 `tea-process-multi-tea` 一條標題（寫「三態」但
  內文與 design.md 都是四態）
- Purpose 逐份改寫，取代 archive 產生的 `TBD - ...` 佔位字串
- 新增 `openspec/BACKLOG.md`：OpenSpec 只有「在做」與「歸檔」兩態，
  想做但沒排到的構想無處可去，只能假裝成 change 賴著。這才是三個 07-27 提案的成因

分流結果 10 → 5：歸檔 3（`tasting-set`／`product-reviews`／`tea-knowledge-content`）、
進 backlog 2（`product-detail-pages`／`agentic-commerce-mcp`，都線上實測確認沒開工）。

**查證推翻了我自己的建議**：`tea-knowledge-content` 看似停滯 35 天，其實早就做完上線
（article schema、`/tea-guide` 兩路由、sitemap、llms.txt、線上攻略文），只是從沒建
tasks.md 所以結不了案。已依實際實作補寫 delta spec 與追溯 tasks（每項附查證方式）後歸檔。

最終：`openspec validate --all` **57/57 零失敗**、specs 52 份、archive 38 個。
遷移後跑 `npx vitest run` 81 檔 / 1061 測試全過，確認無連帶損傷。

### 還沒做的

本節待辦已於 2026-09-20 清理，未結案者全部併入**本檔最後一節**的清單，此處不再維護。
結案的有兩項：「本分支尚未開 PR」（PR #18 已合併）、
「Supabase 唯讀與 Sanity MCP 等權杖」（已於 `88ad271` 裝好，只剩 Vercel MCP 未裝）。

## 2026-08-31（續）今日鳥況回報（bird-report）—— 已實作，等業主跑 SQL

分支 `feat/bird-report`。先立 openspec 提案（4 份文件通過 `openspec validate`），再實作。

### 為什麼做這個

客人最怕的不是花錢，是**開一小時山路上來卻沒看到鳥**（梅山交流道 44 分、嘉義市區 60 分）。
一則第一手的「昨天下午鳥況如何」是唯一能消掉那個顧慮的東西，而且只有住在賞鳥起點的人
給得出來，競爭者複製不了。

### 四個關鍵設計（理由完整版在 design.md）

- **48 小時自動過期，用讀取時判斷不用排程**。排程壞掉的方式正好最糟：過期的
  「鳥況良好」繼續掛在線上，客人白跑一趟會算在店家頭上。少一個狀態就少一個失效模式。
- **季節沿用 `experience_availability_windows`**，不另存日期。日期只能有一個真相來源，
  而兩份不同步的那天正好是季節交界、最多人在看的時候。
- **append-only，不做編輯與刪除**。送錯了補送一則就蓋過去——刪除在對外事實上更危險。
- **第一版只有自由文字**，不做等級下拉。業主的口吻是這品牌最強的東西，選單會把它磨掉。

### 業主確認過的立場

**壞鳥況照實貼。** 只報好消息的東西客人看兩次就不看了，那時候連好消息也沒人信。
後台頁面上直接寫了寫法提示：「寫事實不要寫評價——『下午下雨，四點後零星幾隻』
比『鳥況很差』有用」。事實不扣分，評價會。

### 這批踩到的坑

1. **`bird-report.ts` 直接 import supabase，測試會爆**。本 repo 早有 `*-core.ts` 的
   切法（`bundle-core`／`product-review-core`），純邏輯抽到 `bird-report-core.ts`。
   **這是第二次踩同一個坑**（上次是 `egret-copy.test.ts` 想 import `@/lib/experiences`）。
2. **`no-cascading-renders` 又擋了一次**，這次是後台頁面的 `useEffect(() => { void load(); })`。
   lint 不追進 async 函式，只看到 effect 裡同步呼叫了含 setState 的函式。
   解法照本 repo 既有寫法（`admin/(protected)/settings/page.tsx`）：effect 裡只放 promise chain，
   並把「取資料」（`fetchLatest`，不碰狀態）與「套用狀態」（`apply`）拆開。
3. **測試對 SQL 做字串比對，抓到了註解裡的說明文字**。我自己的註解寫著「沒有 is_active
   ／expires_at 欄位」，測試就斷言失敗。**斷言 SQL 前要先剝掉 `--` 註解**。
4. `git checkout -b` 與 `git commit` 串成一條指令被 guard 擋下——就是我昨天寫進
   lessons 的那條。分開下就過了。

### 驗證證據

vitest 85 檔 **1130** 測試全過（新增 34）、`tsc` 0 錯誤、`npm run lint` **0 error**
（36 warnings 既有債務）、`build` 成功。

反向驗證兩次：
- 把 `FRESH_WINDOW_HOURS` 從 48 改成 72 → 4 條變紅
- 把 RLS 政策改成開放匿名寫入（`FOR ALL ... WITH CHECK (true)`）→ 2 條變紅

`next start` 實測（**資料表尚未建立**的狀態）：
- 攻略文／體驗頁／英文體驗頁三處 `rendered: false`，完全靜默略過，頁面其餘正常
  （注意：原始 HTML 裡搜得到「最近的鳥況」是 next-intl 序列化的訊息資料，不是算繪出來的。
  這是第二次被這種假陽性騙到，第一次是公告條）
- `/admin/bird-report` 未登入 → 重導登入頁
- `POST /api/admin/bird-report` 未登入 → 401

### 還沒做的

本節兩項待辦（業主跑 `add_bird_report.sql`、顯示路徑只驗到單元測試層級）
已完整併入**本檔最後一節**的清單，此處不再重複維護。

## 2026-09-02 補完 AA 對比並依 12 站實測做視覺調校（PR #28，已於 2026-09-20 合併）

分支 `refactor/aa-contrast-redo`，21 個 commit、58 檔、+1024/−704。
**只動前台外觀，沒動邏輯、資料流、金流；後台 `admin/` 0 檔。**

起點是業主問「評估我的網站設計」，一路做成六批改動。全程用**瀏覽器實測**
（computed style + canvas 合成背景）而不是 grep 原始碼——這是這次能抓到
一堆隱形問題的關鍵。

### 做了什麼

**1. 對比債（`670093e` `e2c948b` `6dadc77`）**——色票裡本來就有兩個合規色，
採用率卻只有 3%：`text-light`#6B8872（3.43）308 處 vs `text-muted` 9 處；
`tea-green`#7D9B84（2.85）279 處 vs `green-ink` 15 處。`bg-tea-green`+白字（3.05）
散在 20+ 個前台檔含結帳／登入／購物車。全數遷移，商品價格從綠改墨（2.85→9.31）。

**2. 字重與字距（`df3c9ce` `f1e8258`）**——標題 700→400／600（167 處）；
新增 `--tracking-display: 0.04em` 套 93 個 h1/h2。

**3. 字級行高留白（`fd45a5b`）**——Hero 128→**60px**；敘事行高 1.625→**1.8**（11 處）；
慢段留白 128→**160px**（快慢比 1.33→1.67）。

**4. 產品線跳色（`f6eeeae` `279c0ed`）**——新增 `cta-*`，16 顆轉換按鈕分兩線：
茶葉 `cta-tea`#B34D31 焙火紅、體驗 `cta-visit`#2A4073 紺。

**5. 中間帶清理（`279c0ed` `9dd9f7f`）**——37 顆一般按鈕與公告條改墨色。
真無人地帶（C.03–.08）：首頁 ~1.4%→**0.32%**、登入頁 ~2.5%→**0.46%**。

**6. 首頁兩塊底色（`8d011d6`→`aa52191`）**——信任列 `cream`、季節條帶 `cream-light`。

### 三個實測結論（寫進 design-system，是這次最有價值的產出）

- **12 站的「中間帶 .02–.05」佔比全部是 0%**（Aman／Belmond／六善／涵碧樓／星のや／
  茶籽堂／八代目儀兵衛／Blue Bottle／Onibus／興波／Valrhona／獺祭，6 品類 5 國）。
  規則：**要嘛中性，要嘛真的鮮，不要停在中間**（見 2.1.6）。
- **CJK 大標用正字距不是負的**（一保堂 h2 +3.57px、Aman +0.5px）。我在報告裡先建議
  負字距，那是拉丁文的做法，已標注更正。
- **17 站的最大字級上限是 64px、中位數約 28px**，本站原本 128px。他們的衝擊來自
  **攝影**不是字——照片覆蓋率他們 50–85%，本站 36.9%。

### 三次被業主否決／糾正（都已回退，不要再走一遍）

1. **季節條帶收斂成紺家族**（底、邊、eyebrow、徽章、外框鈕全改紺）→ 否決。
   業主要的是「暖底＋綠配件＋紺主鈕」，**冷色留在重音、不進底色**。
2. **公告條用滿彩度焙火紅** → 業主選墨色。理由：那條全站每頁都在、面積是所有 CTA
   加起來的好幾倍，染成重音色會讓紅從「點」變成「場」。
3. **重音套莫蘭迪低彩度** → 我自己的錯。C.045 的紺比它要對抗的品牌綠 C.048 還低，
   等於沒有重音。修正為 C.140／C.092。

### 還沒做的

**2026-09-20 起清單已整個搬到本檔最後一節**，這裡不再維護。
搬遷原因：`session-start` hook 只讀**最後一節**的「還沒做的」，
清單留在中間的節等於不會出現在開場提示（本節下方第 628 行自己寫過這條規則）。

### 驗證證據

- 四件套：86 檔 **1142 測試**全過、`tsc` 零錯誤、`lint` 0 error（36 warnings 既有債務）、
  build 成功。
- 對比稽核（瀏覽器實測合成背景）：`/experiences` 零不合格；`/products` 剩 12 筆全是
  警示色 `#F59E0B`（2.3 拍板不動）與裝飾符號；`/auth/login` 只剩 LINE `#06C755` 與
  Facebook `#1877F2` 兩個第三方品牌色。
- 產物實查：`tracking-display`、`cta-*` 等 class 逐一確認有生成，未使用的變體正確地沒生成。

### 這次踩到的坑（已寫進 lessons）

- `{/* */}` 放在 `return (` 之後、根元素之前會炸掉整頁——那位置只吃 `//` 或 `/* */`。
  同一則訊息裡改兩個檔，兩個都炸。**改多個檔的 JSX 要先跑 `tsc` 再開瀏覽器。**
- **dev server 正在重編譯時跑 vitest 會出現假紅**（57 failed / 977 total，正常是 1142）。
  同一天中招兩次，第二次已經是依序跑了——所以肇因不是併行。
  **判準：先看總測試數對不對**，少於 1142 就是中斷不是斷言失敗。
- `sed` 的替換字串含 hex `#` 會與分隔符相撞而**靜默失敗**（`661e480` 補救）。
  改檔後要回頭 grep 確認真的改到。

### 收尾（2026-09-04）——清掉這波留下的兩個尾巴

刻意**不開新一節**：這兩項是本節「還沒做的」清單裡的項目，而 WORKLOG 已經超過
MAINT-4 的 10 節上限，再開第 12 節只會讓待壓縮的問題更糟。

**1. 刪 `cta-tea-soft`／`cta-visit-soft`（`#FBEFEA`／`#EEF2F9`）**
定義後兩個月零使用。刪的理由不是省位元組，是**孤兒 token 會誤導**：色盤裡擺著一組
產品線淡底，後來的人會以為「這裡本來就該有淡底可選」拿去用，於是被業主否決過的
「冷色進底色」方案又從側門回來一次。要淡底就走 `tea-cream` 序列。
`cta-*` 從此只有實心與 hover 兩階——它是重音不是場，一有淡底變體就會開始鋪面積。
> 訂它們明度時學到的通則**保留**在 design-system 2.1.5：
> **挑區塊底色要對照那個區塊裡最淡的文字色，不是最深的**（當初照墨字算，漏掉
> `tea-text-muted` 只有 4.37）。token 刪了，這條通則對任何新淡底仍成立。

**2. 套用 `tracking-eyebrow`，前台 22 處**
原本散寫 `[0.3em]`(20 處)、`[0.25em]`(1)、`[0.2em]`(1，BundleCard 的 `t("eyebrow")`)。
**收斂到 0.25em 而非佔多數的 0.3em**：0.3em 在 12px 上是 3.6px 字間，三字以上的中文
eyebrow（「季節限定・現正登場」）會鬆到讀不成詞；0.25em 仍明顯是標籤語彙但不散架。

兩個**刻意不改**的（不是漏改，下次不要「順手補齊」）：
- `HeroBackground` 輪播計數器 `[0.15em]`——`tabular-nums` 的數字，不是 eyebrow。
- `tracking-widest`(0.1em) 的**卡片內**小標，13 處（`exp.nameEn` 之類）。
  同一個檔 `experiences/page.tsx` 裡區塊 eyebrow 用 0.3、卡片標籤用 0.1，是分層。
  實測確認分層還在：`/experiences` 的 Experience 3px、六張卡片標籤 1.2px。

順手：`backups/` 的 WORKLOG 備份到 6 份，依 MAINT-4 刪掉最舊一份（git `c0c354b` 留有歷史）。

**驗證**：1142 測試全過（總數對得上，非中斷）、`tsc` 0、`lint` 0 error／36 warnings
（與上次同數，未新增債務）、build 成功。產物實查 CSS：`.tracking-eyebrow{letter-spacing:
var(--tracking-eyebrow)}` 有生成、變數 `.25em`；`cta` 只剩 `bg-cta-tea`／`bg-cta-visit`／
`hover:bg-cta-*-dark`／`group-hover:bg-cta-visit-dark`，`FBEFEA`／`EEF2F9` 全站零殘留；
舊的 letter-spacing 只剩 `.15em`（計數器）與 `.025/.05/.1em`（Tailwind 內建）。
瀏覽器實測首頁 5 個 eyebrow 全部 computed 3px，無 console error。

**已 push（2026-09-20）**：帳號停權期間（09-04～09-20）這些 commit 只能留在本機，
解封後推上 `refactor/aa-contrast-redo`，經 PR #29 squash 合併進 main（`800b2fd`）。

### 收尾（2026-09-04，續）——WORKLOG 依 MAINT-4 壓縮，11 節 → 3 節

壓縮前 11 節（上限 10）。**沒有直接刪，先把「壓掉會真的丟失」的東西搬到會被讀到的地方**：

| 原本只寫在 WORKLOG 的東西 | 搬去哪 | 為什麼是那裡 |
|---|---|---|
| 業主原話與已確認事實 | **`docs/owner-source-quotes.md`（新建）** | JUDG-11 要求對外宣稱有業主原話，但 repo 裡一直沒有存放它的地方。`copy-guardian` 的掃描範圍已把它列為**比對基準**（不是被掃的對象） |
| 預覽窗格 hidden 會關掉 IO／scroll 事件／**既有元素的樣式重算** | `diagnosis.md` 環境事實表 | 那裡已有一條 `visibilityState` 規則，依 MAINT-3「一條規則只有一個家」**擴充它**而不是新增 |
| `no-cascading-renders`／`useSyncExternalStore`（踩 3 次） | `lessons.md` | — |
| `-core.ts` 切法（踩 2 次）、next-intl grep 假陽性（騙 2 次） | `lessons.md` | — |
| 未結案的待辦 | 本節「還沒做的」 | **hook 只讀最後一節的那個小節**，放別處等於沒寫 |

**業主原話那節（紅茶製程）是這次唯一需要決定去向的**——前一個 session 標記「要壓請先決定
那段原話搬去哪」，所以沒自行處理。決定：搬進 `docs/owner-source-quotes.md` 逐字保留，
不摘要（**改寫過的原話就不再是依據**），並順便把散在其他節的業主確認事實一起收攏：
賞鳥場地哪些建築不是自家的（錯過至少三次）、付款方式、功勞歸屬、鳥況回報立場、
以及兩項**還沒問到業主**的事實（另立「待確認」區，明寫不可拿來寫文案）。

**這次「還沒做的」改成全檔唯一的待辦清單**。原本每節各有一份，壓縮時才發現有些跨節待辦
從 08-25 一路被抄到 08-30 都沒人做（例如「寫信給攻略文作者」）。hook 只顯示前 8 行，
所以按輕重排過，第一行是 GitHub 停權、第二行是有時效的賞鳥季補拍（10/11 截止）。
（2026-09-20 追記：停權已解除，該項移除，現在第一行就是賞鳥季補拍。）

順帶：`lessons.md` 加完三條後**正好 30 條，達 MAINT-4 上限**，下次要開新條目前得先精簡。
（2026-09-20 追記：該次精簡已隨 PR #29 完成，目前 19 條。）
`backups/` 四個檔各補一份備份並修剪到每檔 5 份。

### MAINT-3 步驟 4 的 read-back（2026-09-04 執行，含補做 08-27 欠的那次）

**這筆債欠了 8 天**：2026-08-27 把 `lessons.md` 從 31 條精簡到 16 條、`judgment.md` 加兩條判準，
當時 session 有「不主動開 subagent」的限制，改以逐條自查代替，業主指示下次補驗。
壓縮 WORKLOG 時這條待辦差點跟著被壓掉（checker 的 A1 就是抓到這個），所以一起做掉。

**checker 裁決：A2／A3／A4／A5 PASS，A1 與 B FAIL。兩條都已修，證據如下。**

- **A3 PASS 值得記一筆**：抽查 12 個 commit hash 全部 `git cat-file -e` 通過、19 個檔案路徑全存在。
  壓縮時我是憑記憶寫路徑的，這是最可能出錯而沒出錯的一項。
- **A5 PASS**：hook 實測 8 行待辦逐條完整顯示（改成「一項一行」之前只擠得下 2 項）。

**A1 FAIL → 已修**：就是上面說的那條 read-back 待辦，壓縮後 repo 裡查無蹤跡。
本小節即為補回，且待辦本身已執行完畢，不再列入「還沒做的」。

**B FAIL → 已修，而且比 checker 報的更嚴重。** `lessons.md` 歸檔區有一行寫
「反向驗證用 `git checkout --` 還原會洗掉未 commit 的工作 — **已併入 JUDG-2**」，
查證後：
1. JUDG-2 只講「commit 前先 `git status -sb`」，**跟反向驗證怎麼還原無關**——「已併入」是假指標，
   規則從未真的落地到任何人會讀到的地方。
2. 更糟的是那行**建議改用 `git stash`**，而 `reverse-verify` skill 明文把整個 `git stash`
   列為「壞的退回點（會連測試一起退回，什麼都證明不了）」。**兩份制度檔互相矛盾了七天。**

修法：規則落地到**動作真正發生的地方**（`reverse-verify/SKILL.md` 的「壞的退回點」），
明訂還原突變只能用 Edit 改回來、或事前 `cp` 一份到 scratchpad 當還原點；
歸檔行改成指向該 skill 並註明原本是假指標。

> **教訓：「已併入 X」這種歸檔指標會腐爛，而且腐爛時毫無訊號。**
> 精簡時把條目壓成「已併入某規則」很省事，但沒人會回頭確認 X 真的長出那段內容。
> 下次精簡，**寫「已併入」之前先去 X 把那句話讀出來**；讀不到就不要壓，或先補寫再壓。

順帶補進 `diagnosis.md` 環境事實表：**本機 `python`／`python3` 是 Microsoft Store 的
app-execution 假殼**——`command -v` 找得到、執行卻靜默結束、exit code 仍是 0。
這次用 python heredoc 改 `lessons.md` 連中兩次，檔案完全沒動而指令看起來成功，
回頭 grep 才抓到。**這台機器改檔用 Edit 或 node，不要用 python。**

**後記：那個 python 假殼我踩的是第四次，不是第一次。** 補進 `diagnosis.md` 之後才發現
`lessons.md` 歸檔區早有一條「本機 `python` 是 Windows Store 空殼…**已升格為 JUDG-8**」，
2026-08 就踩過三次。我今天照樣中招，因為升格後留下的是通則（「沒報錯 ≠ 有做到」），
而**「這台機器的 python 是假的」這個具體事實沒有留在任何人開工前會讀的地方**。

這跟上面 B 那條是同一個病的兩種形狀，合起來是這次最該記住的一件事：

> **精簡制度檔時，「升格為通則」與「保存具體事實」是兩件事，不能互相取代。**
> 通則進 `judgment.md`，環境／工具的具體事實進 `diagnosis.md` 事實表，
> 兩邊都要放。只留通則的話，下一個人會用一模一樣的方式再踩一次——
> 這次的證據是同一個坑踩了四次，而它「已經被記錄」了三次。

## 2026-09-20 GitHub 帳號停權解除，停權期間的工作全數推送

帳號 `KuanYuJiangTW`（ID `135186052`）2026-09-04 遭停權，09-20 恢復，歷時 16 天。
支援工單 #4726886。

### 停權的原因

GitHub 官方唯一的說法（始終沒指明是哪一條）：

> Some activity on your account was flagged by our abuse-detection systems for
> manual review, as it may conflict with our Terms of Service.

接著只問了一句 "Could you please share a bit more about how you plan to use GitHub?"
——那是用來分辨真人開發者與 bot 帳號的篩選題。說明用途後即恢復，未被要求改掉任何
具體行為。

> **「這是誤判」是我方判讀，不是官方認定。** GitHub 自始至終沒說明是哪一條，
> 也沒表示標記有誤。下面的「觸發點」同理，全部是推論。

**最可能的觸發點**（推論，未獲官方確認）：`gh` CLI ＋ AI 助理產生的突發性密集認證
API 呼叫，對應 ToS Section H「Abuse or excessively frequent requests to GitHub via
the API may result in the temporary or permanent suspension」。次要因素是整體活動
速率：5.5 個月 813 個 commit、上百條分支。

申訴時**已向 GitHub 承諾**把 API 使用維持在正常互動速率。那是真承諾，不是場面話——
二次被標記通常不會再有第三次機會。

### 解封後的推送

| 分支 | 處置 |
|---|---|
| `refactor/aa-contrast-redo` | 7 個 commit 推送 → PR #29 → squash 合併進 main（`800b2fd`） |
| `claude/gifted-bell-caace2` | 首次推送 → PR #30（Sanity 發布後前台快取沒清），**尚未合併** |
| `backup/cvs-fix-20260801` | **不推**。內容已被 main 的 `923de30` 取代，是同一份工作的舊副本 |

順帶查證到 **PR #18 與 #28 其實都在停權期間合併了**，本檔原本兩處都記成「未合併」，
已一併更正。教訓：停權期間無法查 GitHub，本檔對遠端狀態的記載會整段失真，
解封後要先對帳再相信自己的紀錄。

### 往後的 GitHub 操作原則（避免再次被標記）

- 能用本機 git 完成的就不要走 API：commit、開分支、查歷史一律用 git
- `gh` 只在真正需要時用（開 PR、必要的狀態查詢），**絕不輪詢**
- 不在短時間內連開多條分支或多個 PR
- 查帳號狀態用單次 `gh api rate_limit` 即可

### 還沒做的

已搬到 2026-09-23 節（全檔唯一的待辦清單一律維護在最後一節）。

---

## 2026-09-23 萬鷺朝鳳：Google 自動完成 × GSC 對照，調整攻略文與 llms.txt

- 目標：找出陌生人搜「萬鷺朝鳳／黃頭鷺」用的字，對照 GSC（3 個月 1,560 點擊／2.52 萬曝光／平均排名 4.4），補上沒接住的搜尋意圖
- 分支：`feat/egret-search-intent`（從 `docs/worklog-post-suspension` 分出，含其 WORKLOG commit）。業主同意後開 PR #32，**2026-09-24 合併**（merge commit `9af88ef`，連帶把 #31 一起合進去）；部署約 90 秒上線，`deploy-check` 14 項全過（含 6 條本次改動的 `--expect`：llms.txt 交通與其他觀鷺點、導航區塊兩段步行時間、`#section-s3` 錨點、按鈕副標、導覽頁精簡版）

### 發現（決策依據）

| 意圖 | GSC（前 10 查詢） | 判讀 |
|---|---|---|
| 時間（最佳時間2026 等 4 條） | 520 點擊、CTR 15.8%、排 2.1–4.5 | 贏家，守住 |
| 地點（最佳地點、地點） | 103 點擊、CTR 7.1%、排 3.3–5.1 | 「地點」排 3.3 只有 4.1%，偏低 |
| 導航（景觀平台停車場、賞鷺景觀平台、信淳茶居） | 86 點擊、1,754 曝光、排 **1.1–1.5**、CTR 4.9% | 點擊被 Google 地圖地標吃掉 |
| 主詞「萬鷺朝鳳」 | 64 點擊、2,074 曝光、排 **7.6** | 最大缺口；前面幾乎都是新聞 |

- Google 自動完成有、我們沒接住：**路線**（第 2 名）、行程／一日遊、住宿／民宿、露營、影片，以及整群「黃頭鷺遷徙／過境／是候鳥嗎／是白鷺鷥嗎」
- 前 10 查詢只佔點擊 50%、曝光 34%——**長尾 262 條沒看到**，下次請業主從 GSC 匯出 CSV
- SERP：唯一六組查詢全進前十的攻略文是 vocus／背包客棧（hhann，2025-09），列 7 個觀賞點＋住宿＋周邊，**沒有信淳茶居**
- **「歸巢」無依據**：攻略文、體驗頁共 5 處，已記入 lessons 與 owner-source-quotes §2.7
- **GSC 完整匯出**（業主 2026-09-23 提供 xlsx，272 查詢／42 網頁，未進 repo）：
  - 攻略文拿走 92% 點擊（1,435／1,560）；導覽頁 9,484 曝光排 2.6 但點閱率 0.7%——**最大的漏洞**
  - 目錄錨點 `#section-0…6` 各 7,000+ 曝光（Google 的跳轉連結）
  - 約百條**對話式碎片查詢**（「今天有嗎」「車子要停哪裡」「人會不會很多」「有接駁車」「騎機車」「早上可以嗎」「推薦店家」）與長問句（「請提供逾3萬隻黃頭鷺過境…最新消息」）＝ Google AI 模式的追問，我們排 1–3 名被引用。沒答到的：大眾運輸、順遊景點
  - 錯字變體約 600 曝光（萬鳥朝鳳 249、萬巒朝鳳 100、萬鸞朝鳳 65…）；「樟湖黃頭鷺觀景台」（雲林，別人的地點）77 曝光排 1.5、0 點擊
  - 行動裝置佔曝光 86%；英文頁幾乎沒有曝光，賞鳥英文 SEO 暫不投資

### 已完成

- **Sanity 已發布**（業主同意，2026-09-23）：攻略文＋導覽頁。發布前依業主補充把「鳥會在太興這一段溪谷盤旋比較久」寫進「黃頭鷺是什麼鳥？」段。發布後全站 article／experience／faq 掃「歸巢／roost／head home／comes home／中繼棲地／stopover／一杯冷泡」＝ 0 筆
- **第二、三輪 Sanity 已發布**（業主同意／指示，2026-09-23）：導覽頁搜尋摘要改成先答「3 點到 6 點最壯觀」再帶導覽；攻略文依 §2.11 改成**信淳茶居當主角**——摘要先講茶居、「在哪裡看？」段先推茶居，景觀平台停車場／太興飛瀑停車場／四家鄰居合成一段帶過並引回茶居，另加樟湖（雲林）消歧。copy-guardian 兩輪核對，最後一輪抓到 llms.txt 英文缺兩句已補
- 程式碼同步：導航按鈕副標並列「有洗手間與座位」vs「免費・沒有洗手間與座位」、導航說明改成「導航設信淳茶居就對了」、llms.txt 茶居排第一並帶過其他觀鷺點
- **沒開車的交通**（2026-09-24，業主原話 §2.12）：導航區塊加「搭公車梅山站→橫山站、上下山車次先查好、機車可直接騎到信淳茶居」，標題改「怎麼來：開車路線、公車與機車」，精簡版與 llms.txt 同步。測試釘住原話關鍵字，並禁止出現業主沒給的數字（反向驗證過：塞假的「7 路」會紅）
- **電線更正（PR #33，2026-09-24 合併上線）**：照片說明、方案引言、體驗備援注意事項、llms.txt 拿掉「視野沒有電線」，`egret-copy.test.ts` 釘住；deploy-check 11 項通過
- 攻略文目錄錨點改用 Sanity `_key`（`#section-s2` 取代 `#section-2`）：GSC 匯出顯示 7 個錨點被 Google 當跳轉連結、各 7,000+ 曝光，用序號的話每插一段就全部位移

- 程式碼（commit `cc033f7`，已 push）：llms.txt 新增「萬鷺朝鳳快速事實」；導航區塊標題「怎麼來：開車路線與導航」＋路況寫出「經太平 36 彎」；owner-source-quotes §2.7–2.9。證據：`npm run test` 86 檔／1142 條全綠、tsc 無錯、lint 0 error；本機預覽確認導航區塊文字已算繪
- Sanity 第一輪（2026-09-23 已發布）：攻略文標題改「2026 萬鷺朝鳳最佳時間與地點｜…」、新增「黃頭鷺是什麼鳥？」「一天怎麼排？要不要過夜？」兩段、去掉「歸巢」、無人機改寫成縣府禁航公告；體驗頁 seoDescription／介紹同步去「歸巢／中繼棲地／roost」、「一杯」→「一罐」冷泡茶。變更全文見 commit 內本節與 owner-source-quotes

### 還沒做的

- **Sanity 還有 3 處「視野沒有電線」要改**（業主 2026-09-24 更正，§2.13；repo 端已由 PR #33 修掉並上線）：攻略文 `s3` 第 1 段、`s5b`（想拍照的話）第 1 段、導覽頁 `notes[3]`，中英各一。Sanity 連接器當天連不上，**業主說重新連上後再改**；新文字已擬好（照 §2.13 原話：電線在右側與下方、鳥群從左往右飛、拍鳥群時擋不到）。改完掃全站「沒有電線|無電線|no power lines」應為 0。
- **⏰ 本季補拍黃頭鷺特寫**（賞鳥季到 **10/11**，過了等明年）。`public/images/gallery/` 一張鳥都沒有。同時卡住「第四階照片」。**瓶頸是攝影不是程式。**
- **景觀平台停車場的 Google 商家檔案（業主已在管理，§2.10）**：網站欄位填攻略文、說明寫明「沒有洗手間，洗手間與座位在信淳茶居」、每天貼鳥況、回覆評論；信淳茶居檔案同步。只有業主能做。
- **寫信給 vocus／背包客棧作者 hhann**（六組查詢全進前十、7 個觀賞點沒有信淳茶居），再來是方格子／好好玩 FUNIT／承錠旅行日記。不必等任何程式。
- **驗收（9/24 起）**：正式站已換成新版（2026-09-24 確認：新標題、茶居優先的「在哪裡看？」、黃頭鷺段、導覽頁新摘要都在，「歸巢」0 處）；PR #32 已合併、deploy-check 已過；**兩週後（約 10/8）**在 GSC 看導覽頁點閱率（基準 0.7%）與「萬鷺朝鳳」排名（基準 7.6）有沒有動。
- **PR #30 待合併**（`claude/gifted-bell-caace2`，Sanity 發布後前台快取沒清）：CI 全綠、可乾淨合併，合併會觸發 Vercel 部署。
- **2027 季前（約 7 月）換年**：攻略文標題、體驗 seoDescription、llms.txt 的「2026」與無人機公告日期；同時從 GSC 匯出全部查詢做長尾分析。業主規劃中的住宿開張時補住宿段（§2.9）。
- **兩項事實還沒問到業主**，見 `docs/owner-source-quotes.md` §4：紅茶運費含不含在 800 內、llms.txt「賞鳥起點就是自家的茶居與停車場」。**確認前不可以寫進文案。**
- 商品詳情頁仍不存在（`openspec/BACKLOG.md` 的 `product-detail-pages`，也是「認真補 AI 搜尋收錄」的前置）。
- 清測試資料：訂單 `R2608-E59D`、`R2608-RHCJ` 與綠界測試信用卡那筆（`is_test` 可篩，但後台列表看得到）。
- 零碎：Sanity FAQ 可補三條（帶長輩／推車、下雨、幾點到最好）；ChatWidget 被浮動條頂上去沒在真手機看過。
- 5 個 openspec change 的去向待確認：`tea-process-multi-tea` 等 checker 複驗、`ai-search-seo` 等 Cloudflare 數據、`experience-open-class-request` 等上線實跑、`coupon-shipping-touchpoints` 等確認 `CRON_SECRET`、`experience-seasonal-ordering` 還在寫（3.3／3.4／4.4）。
- 四份 agent 記憶仍是「種子」，尚未經實際使用累積；Vercel MCP 尚未安裝。

> 已結案移除：「業主要跑 `supabase/add_bird_report.sql`」——2026-09-23 正式站攻略文已顯示 9/22 的鳥況回報，表已建立、功能在跑。
> 這裡是**全檔唯一的待辦清單**。**一律維護在本檔最後一節**——hook 只讀最後一節，開新節時要把這份清單一併搬過去。按輕重排且**刻意一項一行**。
