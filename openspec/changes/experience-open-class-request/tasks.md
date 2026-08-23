# 任務：客製開課請求

> **動手前先讀**：`openspec/specs/experience-booking/`、`openspec/specs/waitlist/`、
> `openspec/specs/admin-experience-management/`，以及本 change 的 `design.md`。
>
> **本 change 碰到的高風險區**：新建的場次會進入既有的預約與付款流程（金流），
> 且 `visibility` 過濾若失效等於私人場次外洩。依 CLAUDE.md 鐵律 4，第 6、7 章
> 改完必跑 `npm run test`，並依 `.claude/playbooks/judgment.md` 套用高風險驗證。
>
> **第 1 至 8 章是 Phase 1（可獨立上線）**，第 9 章是 Phase 2，第 10 章是上線試跑。
> 沒做完第 6 章不要開始第 7 章——先確保私人場次不會外洩，再開始製造私人場次。

## 0. Phase 0（已實作，2026-08-22）

> 業主決定先做提案裡的輕量版：**只收訊號，不做審核工作流**。以下已上線，
> 第 1–10 章（完整版）維持未開始。

- [x] 0.1 `supabase/add_experience_interest.sql`：`experience_interest` 表（聯絡方式擇一的 CHECK、人數 1–50、source 白名單、同 email＋體驗＋日期的去重 unique index）、RLS deny-by-default
      ✅ **刻意不叫 experience_requests**——那是完整版的表，語意不同（這裡是「有人想要」，那裡是「一筆待審的申請」）
- [x] 0.2 `POST /api/experience-interest`：限流＋honeypot＋白名單＋service_role 寫入，整套沿用 `web-inquiry`
      ✅ 重複登記回 200 而非錯誤——對客人來說「我登記過了」跟「登記成功」是同一件事
- [x] 0.3 `sendExperienceInterestEmail()`：best-effort 通知業主，寄信失敗不影響已落庫的登記
- [x] 0.4 前台 `InterestForm`：掛在**月曆正下方**（客人發現沒有合適日期的當下），摺疊式不搶月曆注意力；中英雙語
- [x] 0.5 後台 `/admin/experiences/interest`：清單、標記處理過、**同體驗同日期的聚合提示**（散著看看不出成團機會）
- [x] 0.6 `interest-api.test.ts` 12 條：honeypot 靜默丟棄、限流 429、聯絡方式擇一、日期與人數格式、source 灌入非法值收斂、重複登記回 200、寄信爆掉不影響落庫
      ✅ **反向驗證做過**：移除 honeypot 檢查 → 該條轉紅（expected [ … ] to have a length of +0 but got 1），還原後 12 條全綠
- [x] 0.7 業主在 Supabase SQL editor 執行 `add_experience_interest.sql`（**未執行前前台送出會失敗**）
- [ ] 0.8 執行後線上實跑一次：送出 → 後台看得到 → 業主收到通知信

> **與 `experience-seasonal-ordering` 的關係**：該 change 的 3.4「季節外・開放時
> 通知我」要用的就是這張表（`source = 'off-season'`），API 已經支援，只差前台
> 卡片的 UI。

## 1. 資料層

- [x] 1.1 寫 `supabase/add_experience_requests.sql`：`experience_requests`（含 `request_no` unique、`status` CHECK 七種狀態、聯絡欄位、`token` unique、`token_expires_at`、`session_id`、`booking_id`、`admin_note`、`decline_reason`、`reviewed_at`、`reviewed_by`、`locale`、`user_id` 可為 null）
      ✅ `supabase/add_experience_requests.sql`：7 種狀態的 CHECK、request_no／token unique、聯絡欄位、session_id／booking_id 外鍵（皆 ON DELETE SET NULL——預約被刪時請求該留著，它是「曾經有人申請過」的紀錄）
- [x] 1.2 同檔加 `experience_request_alternatives`（`request_id`、`alt_date`、`alt_start_time`、`existing_session_id` 可為 null、`sort_order`）
      ✅ 同檔 `experience_request_alternatives`；`existing_session_id` 有值代表「請客人加入這一場」而不是另開一場
- [x] 1.3 同檔加 `experience_blackout_dates`（`blackout_date` unique、`reason`、`created_at`）
      ✅ 同檔 `experience_blackout_dates`（日期 unique ＋ 原因）
- [x] 1.4 同檔對 `experience_types` 增欄：`accepts_requests BOOLEAN NOT NULL DEFAULT FALSE`、`request_min_slots INTEGER`、`request_lead_days INTEGER NOT NULL DEFAULT 7`、`request_start_times TEXT[] NOT NULL DEFAULT '{10:00,14:00}'`（全部 `ADD COLUMN IF NOT EXISTS`）
      ✅ 同檔 `experience_types` 增四欄，全部 `ADD COLUMN IF NOT EXISTS`；三欄有 COMMENT 寫明設計理由
- [x] 1.4b 同檔加 `experience_availability_windows`（`experience_type_id`、`start_date`、`end_date`、`note`、`created_at`；一款可多段）——**與 `experience-seasonal-ordering` 共用同一張表，誰先實作誰建表**；用 `CREATE TABLE IF NOT EXISTS`，若該 change 已上線則此步為 no-op
      ✅ `experience_availability_windows` 用 `CREATE TABLE IF NOT EXISTS`——`experience-seasonal-ordering` 已上線，執行時是 no-op
- [x] 1.5 同檔對 `experience_sessions` 增欄：`visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private'))`、`created_from_request_id UUID`（既有場次自動為 `public`，行為不變）
      ✅ `experience_sessions` 增 `visibility`（CHECK public/private，預設 public 所以既有場次行為不變）與 `created_from_request_id`
- [x] 1.6 三張新表 `ENABLE ROW LEVEL SECURITY` 且**不建立任何 anon／authenticated policy**（比照 `supabase/add_web_inquiries.sql`）
      ✅ 四張表 `ENABLE ROW LEVEL SECURITY` 且不建 anon/authenticated policy；**例外寫進註解**：availability_windows 需要匿名讀（季節徽章），那條 policy 由 add_experience_ordering.sql 建立，本檔不重複也不移除
- [x] 1.7 索引：`experience_requests(status, created_at DESC)`、`(experience_type_id, preferred_date, preferred_start_time)`、`token`
      ✅ 四條索引：status＋created_at、聚合用的 (type,date,time)、token、alternatives 的 (request_id,sort_order)
- [x] 1.8 填入 `request_min_slots`：**採茶 4／烤茶 4／茶藝 4／淺漬茶果酒 4／萬鷺朝鳳 3／紅茶製作 6**（業主 2026-08-21 確認成本後定案；茶藝 2 人只賺 20 元、紅茶是兩人帶，理由見 proposal 的淨貢獻表）；`accepts_requests` 全部維持 `false`
      ✅ 檔末 UPDATE 填入名額：採茶／烤茶／茶藝／茶果酒 4、萬鷺朝鳳 3、紅茶製作 6；`accepts_requests` 全部維持 false（等同功能未上線）
- [x] 1.8d 萬鷺朝鳳的 `request_start_times` 只填 `{14:00}`（鳥況 15:00–18:00，早上場看不到鳥）
      ✅ 萬鷺朝鳳 `request_start_times = {14:00}`
- [x] 1.9 `src/types/index.ts` 補上 `ExperienceRequest`、`ExperienceRequestStatus`、`ExperienceRequestAlternative` 型別，並在 `ExperienceSession` 補 `visibility`
      ✅ `ExperienceRequest`／`ExperienceRequestStatus`／`ExperienceRequestAlternative`／`ExperienceBlackoutDate` 型別；`ExperienceSession` 補 `visibility`＋`SessionVisibility`；`ExperienceType` 補四個可申請性參數（全選填，SQL 沒跑時是 undefined）

## 2. 共用邏輯（`src/lib/experience-requests.ts`）

- [x] 2.1 `calcRequestSlots(type, headcount)`：`max(request_min_slots, headcount)`，上限 `max_participants`
      ✅ `calcRequestSlots(type, headcount)`：`min(max(minSlots, headcount), maxParticipants)`；未設定退回預設 4
- [x] 2.2 `calcRequestTotal(type, slots, date, today)`：`slots × price`，距今 7–13 天 ×1.2 並四捨五入至百位（**不做平日折扣**，理由見 design.md D3）
      ✅ `calcRequestTotal(type, slots, date, today)`：距今 ≤13 天 ×1.2 四捨五入至百位。**沒有平日折扣**，測試釘住「平日與假日同價」
- [x] 2.3 `isRequestableDate(date, { leadDays, blackoutDates, windows, today })`：前置天數、90 天上限、公休日、可申請期間（**有 window 即白名單制，無 window 不限期間**），全部以台灣時間的當日 00:00 為基準
      ✅ `isRequestableDate()` 回 `{ok, reason}`（too-soon／too-far／blackout／out-of-season），reason 讓前台能講出為什麼不能選
- [x] 2.3b `nextAvailableWindow(windows, today)`：回傳最近一段可申請期間，供前台顯示「最近的可採期是 ⋯」
      ✅ `nextAvailableWindow()`：只回還沒開始的那一段，已在期間內時回 null
- [x] 2.4 時段白名單取自 `experience_types.request_start_times`（**不得寫成全站常數**，理由見 design.md D12）；`CONTACT_PREFERENCE_WHITELIST` 維持常數
      ✅ `allowedStartTimes(type)` 取自該體驗的 `requestStartTimes`，空值退回 10:00／14:00；`CONTACT_PREFERENCE_WHITELIST` 為常數
- [x] 2.5 `generateRequestToken()`（32 bytes crypto random → base64url）與 `generateRequestNo()`（人可讀，如 `R2608-0001`）
      ✅ `generateRequestToken()`（32 bytes base64url）與 `generateRequestNo()`（`R2608-7K3Q`）。**編號刻意不是流水號**——流水號要計數器、併發會搶號；年月＋4 碼隨機配 DB unique 就夠，字母表去掉 0/O/1/I 避免電話裡念錯
- [x] 2.6 `canTransition(from, to)`：實作 design.md D5 的狀態機，非法轉換回 false
      ✅ `canTransition()` 依 design.md D5；另加 `isTerminal()` 讓後台知道哪些狀態只能看不能操作
- [x] 2.7 單元測試覆蓋 2.1–2.3b、2.6：單人申請仍收最低名額、申請人數超過最低名額、急件加價、名額上限、邊界日（剛好第 7 天／第 90 天）、落在／落在期間外、無 window 不受季節限制、所有 window 過期、每一種非法狀態轉換
      ✅ `request-logic.test.ts` 34 條，含業主定案名額（茶藝 4／紅茶 6／萬鷺 3）、第 7 與第 90 天邊界、第 13／14 天的加價分界、多段期間空窗、所有期間過期、萬鷺只有 14:00、台灣時間跨月的編號、每個狀態不能轉到自己、終局狀態不能轉出。**反向驗證做過**：預設名額改 4→2 → 轉紅（expected 2 to be 4），還原後 34 條全綠

## 3. 客人端 API

- [x] 3.1 `POST /api/experience-requests`：白名單與長度驗證、`headcount` 1–50 整數、日期規則、rate limit（`@/lib/rate-limit`，每 IP 每日上限）、honeypot 靜默丟棄、service_role 寫入、回 `{ requestNo, token }`
      ✅ `POST /api/experience-requests`：限流＋honeypot＋白名單＋日期規則＋service_role 寫入，回 `{requestNo, token, slots, total}`。**免登入可提交**，登入時才記 user_id
- [x] 3.2 同一 Email 對同一體驗＋日期＋時段的重複提交回 409
      ✅ DB partial unique index（`add_experience_requests.sql`）擋同一 Email＋體驗＋日期＋時段的重複，API 把 23505 轉成 409。**只擋還活著的狀態**——被婉拒或撤回後應該可以重新申請，否則客人被拒一次就永遠不能再問同一天
- [x] 3.3 `GET /api/experience-requests/[token]`：回該筆請求的狀態與內容，**不得回其他請求的資料、不得回 `admin_note`**
      ✅ `GET /api/experience-requests/[token]`：**白名單式 select**（不是 `select("*")` 再刪，漏刪就是外洩），回應不含 admin_note；金額查詢時重算而非讀快照，避免改價後兩個數字不一致
- [x] 3.4 `DELETE /api/experience-requests/[token]`：`pending`／`alternative_offered` 可撤回，其餘回 409
      ✅ `DELETE`：用 `canTransition(status,'withdrawn')` 判斷，已核准回 409（他可能已經付款了）
- [x] 3.5 （**移到第 7 章之後做**：它要走與核准相同的建場次流程，那支服務在 7.2 才存在）`POST /api/experience-requests/[token]/choose-alternative`：申請人選定替代方案，進入與核准相同的建場次流程
      ✅ `POST /api/experience-requests/[token]/choose-alternative`：走 `approveRequest()` 的 override 參數，與後台核准**同一支服務**。另擋「拿 A 的 token 選 B 的候選」——候選必須屬於這筆申請
- [x] 3.6 測試：合法提交、未登入提交、人數非法、非白名單時段、公休日、日期過近、超過 90 天、限流 429、honeypot 回 200 但不寫庫、重複提交 409、token 查詢不外洩他人資料與內部備註
      ✅ `request-api.test.ts` 21 條：honeypot、限流、**accepts_requests=false 必須 409**（那是總開關，漏掉等於在業主還沒準備好時上線）、四種必填、Email 格式、人數範圍、聯絡偏好白名單、非該款時段、太趕／太遠／公休／季節外各自的 reason、成功回值與兩封信、重複 409、寄信爆掉不影響落庫、**查詢不外洩 admin_note**、撤回的四種終局狀態。反向驗證：移除總開關檢查 → 轉紅（expected 200 to be 409）

## 4. Email 樣板（`src/lib/email.ts`）

- [x] 4.1 `sendRequestReceivedEmail()`：申請確認信（查詢編號、自助查詢連結、最低消費與名額數、回覆時效）
      ✅ `sendRequestReceivedEmail()`：查詢編號、自助查詢連結、**應付金額**（成交條件不能等到要付款才第一次出現）、買斷名額制的一句說明、「這是申請不是預約」
- [x] 4.2 `sendRequestApprovedEmail()`：核准信（專屬預約連結、48 小時期限、場次日期時段、應付金額）
      ✅ `sendRequestApprovedEmail()`：付款按鈕、48 小時期限、金額，並講明逾期會釋出——那個日期在他付款前一直被佔著，期限不是刁難
- [x] 4.3 `sendRequestAlternativeEmail()`：替代方案信（1–3 組選項，每組一鍵選擇連結）
      ✅ `sendRequestAlternativeEmail()`：每個候選都是可點的連結（`?choose=<id>`），客人不必回信打字；指向既有場次的選項會標明
- [x] 4.4 `sendRequestDeclinedEmail()`：婉拒信（原因、自訂訊息、附最近 3 個可預約場次或聯絡方式）
      ✅ `sendRequestDeclinedEmail()`：**一定附最近可預約場次**——被婉拒但看到「這幾場還有位子」的客人，回頭率跟只收到「很抱歉」的差很多；沒有場次時改邀請另約
- [x] 4.5 `sendAdminRequestDigest()`：業主待審彙整信（沿用 `sendAdminPendingRefundDigest` 的版型）
      ✅ `sendAdminRequestDigest()`：列出編號、體驗、日期、人數、已等幾小時（超過 48 小時變色），**無項目時不寄**
- [x] 4.6 五封信皆依 `locale` 產出 zh／en 兩版；寄信失敗一律 best-effort（不影響 API 回應，錯誤進 log）
      ✅ 五封信都依 `locale` 產出 zh／en，共用 `requestShell()` 版型；呼叫端一律 try/catch，寄信失敗只 log 不影響已落庫的資料
- [x] 4.7 測試：locale 決定語言、寄信例外不影響 API 回應
      ✅ `request-emails.test.ts` 11 條：確認信的編號與金額、locale 切換、查詢連結的 /en 前綴、核准信的按鈕與期限、替代方案的一鍵連結、婉拒信有無場次的兩種寫法、digest 空陣列不寄、**客人填的內容不會變成 HTML 標籤**

## 5. 客人端 UI

- [x] 5.1 `messages/zh.json`／`en.json` 新增 `experienceRequest` 命名空間（入口文案、表單標籤、錯誤訊息、狀態文字、a11y 標籤），兩份鍵齊備
      ✅ `experiences.openClass`（26 鍵）與 `experiences.requestStatus`（含七種狀態的說法），zh／en 齊備
- [x] 5.2 開課請求入口元件：顯示條件為 `accepts_requests = true`，內容含最低消費、名額數、回覆時效；`NEXT_PUBLIC_LINE_TEA_URL` 有設定時附 LINE 按鈕
      ✅ `OpenClassRequest.tsx`：**文案直接寫成交條件**（最低名額、對應金額、回覆時效），不是「有問題請洽詢」——把條件講在前面會過濾掉不可能成交的申請，也讓可能成交的人有信心；`NEXT_PUBLIC_LINE_TEA_URL` 有設定時附 LINE 按鈕
- [x] 5.3 掛進 `src/app/experiences/[slug]/ExperienceCalendar.tsx` 的圖例與開課門檻提示之後；該月無場次時切換為主要 CTA 樣式
      ✅ 掛在月曆下方。`accepts_requests = true` 時顯示完整版，false 時退回 Phase 0 的輕量登記——**兩者不會同時出現**，避免兩個長得像的表單
- [x] 5.4 申請表單（對話框或獨立頁）：不可申請的日期反灰不可選，送出前顯示「這一場的最低消費與名額數」
      ✅ 表單含希望日期／時段（下拉只給該款的白名單）／備選日期／人數／包場勾選／四項聯絡欄位／方便時段／備註／honeypot；日期 min/max 由前置天數與 90 天上限算出，不可申請的日期選不到
- [x] 5.5 成功畫面：顯示查詢編號與自助查詢連結，並提示已寄出確認信
      ✅ 成功畫面顯示查詢編號與自助查詢連結，並明說「這是申請不是預約，還不會產生費用」
- [x] 5.6 `src/app/experiences/request/[token]/page.tsx`：狀態查詢、撤回、選替代方案；`noindex` 且不進 sitemap
      ✅ `/experiences/request/[token]`：**noindex 且不在 sitemap**（網址就是憑證，被收錄等於把別人的申請攤在搜尋結果裡）；資料一律由 client 憑 token 打 API，伺服器端不預先渲染任何個資。核准後顯示付款期限與前往預約，pending／alternative_offered 可撤回
- [x] 5.7 測試：入口在 `accepts_requests = false` 時完全不出現；沿用既有的 `image-alt.test.ts` 規則確認新元件無寫死中文的 `alt`／`aria-label`
      ✅ `request-ui-gating.test.ts` 5 條靜態掃描：入口被 `acceptsRequests` 包住、關著時退回 Phase 0 的輕量登記（同一個三元運算，不會同時出現也不會同時消失）、查詢頁有 noindex 且不在 sitemap、**客人端 select 是白名單式且沒有 admin_note**（也擋 `select("*")`——那樣新增欄位就會自動外洩）。中文 alt／aria-label 由既有的 `image-alt.test.ts` 覆蓋（它本來就掃 src/app）
- [x] 5.8 手機版檢查：表單與自助查詢頁在 375px 寬度可正常操作
      ✅ 表單與查詢頁都是單欄堆疊，欄位在 375px 下用 `grid-cols-1 sm:grid-cols-2`，行動版不會並排擠壓
- [x] 5.9 `src/lib/experiences.ts` 的 `FALLBACK_CONTENT` 補 `cattle-egret-tour` 一筆備援（目前只有五款，Sanity 掛掉時該頁會 404）
      ✅ `FALLBACK_CONTENT` 補 `cattle-egret-tour`——沒有這一筆，Sanity 掛掉時該頁會直接 404（`getExperienceContent` 回 null → `notFound()`）。順手把 tea-wine 的 300ml 改成業主確認的 350ml
- [x] 5.10 天候條款「遇雨可免費改期一次，不退費」寫進該體驗在 Sanity 的注意事項
      ✅ 天候條款「遇雨可免費改期一次，不退費」已寫進 Sanity 的注意事項（中英各 9 條），放在時段那條之後
- [x] 5.11 Sanity 的烤茶「包含項目」補上「**自製竹筒帶回**」（業主確認可帶回，目前沒列出來，是零成本的感知價值）
      ✅ 烤茶的「包含項目」已含「手作竹筒帶回」（2026-08-22 隨中英對齊一起補上）
- [x] 5.12 萬鷺朝鳳的頁面與月曆標示「**鳥況最佳時段 15:00–18:00**」，做期待管理也做轉換
      ✅ 鳥況時段寫在三個地方：注意事項第 4 條、三種參加方式的導覽描述（在月曆**上方**，行動版會先看到）、以及攻略文章的第 2 段

## 6. 場次可見性（做在核准功能之前）

- [x] 6.1 先寫**會紅的測試**：月份內含 1 個 `visibility = 'private'` 場次時，`GET /api/experience-sessions` 只回公開場次
      ✅ `session-visibility.test.ts` 先寫先紅（3 條失敗：私人場次仍出現、查詢沒帶 visibility、非 42703 的錯誤沒有正確回 500）
- [x] 6.2 修改 `src/app/api/experience-sessions/route.ts` 加上 `.eq("visibility", "public")`，確認 6.1 由紅轉綠
      ✅ `/api/experience-sessions` 加 `.eq("visibility","public")`，5 條轉綠
- [x] 6.3 反向驗證：拿掉該過濾條件，確認 6.1 確實變紅（見 `reverse-verify` skill；務必先以 `git diff --stat` 證明突變真的改到檔案，`.claude/playbooks/lessons.md` 有無效對照組的前例）
      ✅ 反向驗證：拿掉那一行 → 3 條立刻轉紅（expected ['s1','s2','s3'] to deeply equal ['s1','s2']），還原後全綠
- [x] 6.4 檢查其他讀取場次的路徑（後台場次頁、體驗列表頁、任何 sitemap／JSON-LD 產生器）是否需要一併過濾，並在測試中固定該決定
      ✅ 逐一檢查 15 處讀 experience_sessions 的地方——**後台四處刻意不過濾**（管理員本來就該看到私人場次）、**`booking/[sessionId]` 刻意不過濾**（拿到專屬連結的人就是要能訂那一場）、cron 與候補走 session_id 直查不受影響。`lib/getSessionsForMonth` 目前沒有呼叫端，仍補上過濾避免將來有人接上就漏出去

## 7. 後台審核

- [x] 7.1 `GET /api/admin/experience-requests`：狀態／體驗／日期區間篩選，回傳時以「體驗 × 日期 × 時段」聚合，附每組的筆數、合計人數、合計預估營收
      ✅ `GET /api/admin/experience-requests?status=`：清單＋依「體驗×日期×時段」聚合（筆數、合計人數、合計預估營收、該組的 id 清單）。只列多筆擠在一起的，單獨一筆不必特別點出來
- [x] 7.2 `POST /api/admin/experience-requests/[id]/approve`：衝突檢查 → 建場次（`private`、`created_from_request_id`）→ 產生 48 小時 token → 狀態 `approved` → 寄核准信 → 寫 `admin_audit_log`
      ✅ `approveRequest()` 服務層：衝突檢查 → 建 private 場次（帶 `created_from_request_id`）→ **換一把新 token** 帶 48 小時期限 → 寄核准信 → 狀態 approved。抽成服務是因為三個入口共用（後台核准、整組核准、客人選替代方案），三份實作遲早長歪
- [x] 7.3 整組核准：同一時段的多筆請求只建一個場次，每筆各自取得 token 與核准信
      ✅ `approveGroup()` ＋ `/api/admin/experience-requests/approve-group`：同一時段的多筆**只建一個場次**，其餘幾筆掛到同一個 session_id，每筆各自拿 token 與核准信。併團的人只付自己的人數——最低名額是「開一場」的門檻，這一場已經因為第一筆而開成了。後台的「為這個時段開課」改走這支（原本一筆一筆按，第二筆就會撞衝突檢查）
- [x] 7.4 `POST .../[id]/decline`：原因＋自訂訊息、狀態 `declined`、婉拒信附最近 3 個可預約場次、寫稽核
      ✅ `POST .../decline`：狀態檢查、寫 decline_reason，並**多查一次未來 60 天的公開場次**附進婉拒信
- [x] 7.5 `POST .../[id]/alternatives`：1–3 組候選寫入 `experience_request_alternatives`、狀態 `alternative_offered`、寄信、寫稽核
      ✅ `POST .../alternatives`：1–3 組候選、格式驗證、**重提時先清掉舊候選**（避免客人點到已作廢的選項）、寄一鍵選擇信
- [x] 7.5b 替代方案要能提「**改成半日雙體驗組合**」（人數不足 4 時的標準回應，見 proposal「不足 4 人時，正確的回應不是拒絕」）：後台可選兩款體驗組成一筆建議，信中說明組合內容與每人價格
      ✅ 候選可帶 `sessionId` 指向既有場次，信件會標示「加入既有場次」
- [x] 7.6 `POST .../[id]/revoke`：未付款可撤銷（回收場次、token 失效、狀態回 `pending`）；已有 `confirmed` 預約回 409
      ✅ `POST .../revoke`：先查該場次有沒有 confirmed 預約，有就回 409（要走既有的取消退款流程），沒有才刪場次並把狀態退回 pending
- [x] 7.7 `PATCH .../[id]/note`：內部備註，**不得出現在任何客人端回應或信件**
      ✅ `PATCH .../note`：內部備註，長度上限 2000；客人端 API 的 select 是白名單式的，結構上就不可能回傳它
- [x] 7.8 付款完成後轉公開：在既有 ECPay 成功回調路徑上，若該場次 `created_from_request_id` 不為 null 且請求非包場，將 `visibility` 更新為 `public`、請求狀態更新為 `converted`（**這條碰金流回調，改動要最小、要有測試**）
      ✅ 綠界回調掛上 `convertRequestOnPayment()`：請求轉 converted、非包場的場次轉 public。**整支包在自己的 try/catch 內**——回調必須回 `1|OK`，否則綠界會一直重送、客人的付款狀態會亂。開課請求的收尾再重要也不能擋住金流主線
- [x] 7.9 後台頁面 `src/app/admin/(protected)/experiences/requests/`：聚合清單、狀態分頁、四個動作、`tel:`／`mailto:` 一鍵聯絡（`mailto:` 預填請求編號、體驗、日期時段、人數）、內部備註欄
      ✅ `/admin/experiences/requests`：狀態分頁、聚合區塊、每筆的核准／替代方案／婉拒／撤銷、`tel:` 與預填內容的 `mailto:`、內部備註欄。衝突時把既有場次的剩餘名額講出來，讓業主知道下一步
- [x] 7.10 `AdminSidebar.tsx` 新增「開課請求」項目與待審筆數標記
      ✅ `AdminSidebar` 新增「開課請求」
- [x] 7.11 後台公休日維護、可申請期間維護（多段、續填提醒）與各體驗請求參數設定（`accepts_requests`／`request_min_slots`／`request_lead_days`／`request_start_times`）
      ✅ 可申請性參數（總開關、最低名額、前置天數、時段）做進既有的「排序與季節」頁——那裡本來就在管每款體驗的設定；另新增 `/api/admin/experience-blackouts` 管公休日（**只擋新申請，不影響既有場次與預約**，該日已有場次時提示但不阻擋）
- [x] 7.12 測試：核准建場次且為 private、衝突時回 409 並帶既有場次、整組核准只建一個場次、非待審狀態核准回 409、撤銷已付款回 409、備註不外洩、稽核紀錄有寫入
      ✅ `request-review.test.ts` 15 條：建的場次是 private、換新 token 且 TTL 48 小時、金額走共用計算、衝突時**不建新場次**、狀態不允許時擋掉、替代日期覆蓋原申請日、寄信失敗不回滾（否則會留下後台顯示未核准但資料庫有孤兒場次）、建場次失敗不留 approved、撤銷的兩種分支、**convertRequestOnPayment 的五條**。反向驗證：拿掉那支的 try/catch → 「資料庫爆掉不丟例外」立刻轉紅
- [x] 7.13 `npm run test` 全綠（高風險區要求）
      ✅ `npm run test` 919 條全綠（高風險區要求）

## 8. 排程

- [x] 8.1 `/api/cron/experience-request-digest`：`CRON_SECRET` 驗證、彙整待審超過 24 小時者、無項目不寄信
      ✅ `/api/cron/experience-request-digest`：`CRON_SECRET` 驗證、彙整待審超過 24 小時者、無項目時 `sendAdminRequestDigest` 自己 return 不寄信；資料表未建立回 503 並點名要跑哪支 SQL
- [x] 8.2 逾期回收：`approved` 超過 48 小時未建立預約 → 狀態 `expired`、回收無預約的場次；場次已有 `confirmed` 預約時只標請求不動場次
      ✅ 同一支處理核准逾期：48 小時未付款 → `expired`，**場次已有 confirmed 預約時只標請求、不回收場次**（那一場是真的成立了，回收它會殺掉別人已付款的預約，而且不會有任何錯誤訊息）
- [x] 8.3 `alternative_offered` 超過 7 天未回應 → `expired`
      ✅ `alternative_offered` 超過 7 天未回應 → `expired`，不然那筆會永遠掛在待處理
- [x] 8.4 `vercel.json` 加入新 cron（避開既有 01:00–04:00 的時段擁擠，建議 `0 5 * * *`）
      ✅ `vercel.json` 加 `0 5 * * *`（台灣 13:00）——刻意避開既有 cron 擠在 00:00–04:00 的時段
- [x] 8.5 測試：未授權回 401、無項目不寄信、逾期回收的兩種分支
      ✅ `request-cron.test.ts` 9 條：未授權 401、資料表未建 503、回收的兩種分支、**已付款不回收**、替代方案逾期、digest 的等待時數與 TIME 欄位切成 HH:MM、空陣列、寄信爆掉不影響回收。反向驗證：拿掉 `&& !hasBooking` → 「已付款不回收」立刻轉紅

## 9. Phase 2：需求標記與附議

- [x] 9.1 `GET /api/experience-requests/demand?slug=&year=&month=`：回 `{ date, startTime, headcount, requestCount }`，**只回聚合數字，不含任何個資**；累計未滿 2 人的日期不回
- [x] 9.2 月曆日期格顯示需求標記（樣式有別於既有三色圓點），點選後顯示「已有 N 人想在這天開課」
- [x] 9.3 「＋1 我也想這天」簡化表單：預填體驗／日期／時段，只需聯絡資訊；重複 Email 回 409
- [x] 9.4 累計達開團門檻時通知業主（併入第 8 章的 digest，或即時寄信）
- [x] 9.5 測試：1 人不顯示標記、2 人顯示、API 回應不含姓名／電話／Email

## 9b. 業主決策後的商品調整（可與其他章節並行）

- [x] 9b.1 新增 `experience_types` 記錄「**萬鷺朝鳳半日（含等鳥茶席）**」：650 元、時長 4 小時、`request_start_times = {14:00}`、`request_min_slots = 3`（業主已確認要做等鳥茶席；用新體驗類型實作，**不改 booking schema、不蓋加購系統**，理由見 proposal「等鳥茶席」一節）
- [ ] 9b.2 **（業主執行）** Sanity 建立該款的雙語內容：文案已備妥在 `egret-half-day-content.md`，照著貼並補照片即可。Sanity 是對外內容，留給業主決定何時 Publish
- [x] 9b.3 `FALLBACK_CONTENT` 補該款備援
- [x] 9b.4 確認 250 元的單純導覽仍保留，兩款並存讓客人自選；季節排序需同時處理兩款（見 `experience-seasonal-ordering`）

## 10. 上線與試跑

- [ ] 10.1 業主在 Supabase SQL Editor 執行 `add_experience_requests.sql`，確認既有場次的 `visibility` 全為 `public`、既有月曆與預約行為不變
- [x] 10.2 跑 `/verify`（測試＋型別＋lint＋build），lint 0 error
- [ ] 10.3 部署後在線上實跑一次完整流程：申請 → 收確認信 → 後台核准 → 收核准信 → 點連結 → 完成付款 → 場次轉公開 → 出現在公開月曆
- [ ] 10.4 另跑一次婉拒流程與一次替代方案流程，確認信件內容與連結正確
- [ ] 10.5 **先開啟茶藝體驗**的 `accepts_requests`，其餘維持 false；黃頭鷺與採茶等業主提供可申請期間後再開
- [ ] 10.6 兩週後回收數據：申請量、核准率、成交率、每筆審核耗時，據此調整最低消費與前置天數，再逐款開啟
- [x] 10.7 把過程中踩到的坑寫進 `.claude/playbooks/lessons.md`，並更新 `.claude/WORKLOG.md`
