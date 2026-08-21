# 任務：體驗卡片的季節排序

> **動手前先讀** 本 change 的 `design.md`，以及 `openspec/changes/experience-open-class-request/design.md`
> 的 D11——`experience_availability_windows` 是兩個 change 共用的同一張表，**誰先實作誰建表**。
>
> **不是高風險區**（不碰金流、庫存、auth、RLS、cron），但**絕對不可改任何 `id`**：
> `experience_sessions`、`experience_bookings`、`experience_reviews` 三張表以外鍵指著
> `experience_types.id`。任務 1.1 之前先讀 `supabase/booking_schema.sql` 確認外鍵關係。

## 1. 資料層

- [x] 1.1 寫 `supabase/add_experience_ordering.sql`：`experience_types` 增欄 `sort_order INTEGER NOT NULL DEFAULT 100`、`pinned_until DATE`（`ADD COLUMN IF NOT EXISTS`）
      ✅ SQL 已寫：sort_order DEFAULT 100 ＋ pinned_until DATE，皆 ADD COLUMN IF NOT EXISTS
- [x] 1.2 同檔 `products` 增欄 `sort_order INTEGER NOT NULL DEFAULT 100`
      ✅ 同檔 products.sort_order
- [x] 1.3 同檔建 `experience_availability_windows`（`experience_type_id`、`start_date`、`end_date`、`note`；`CREATE TABLE IF NOT EXISTS`，**若 `experience-open-class-request` 已建則此步為 no-op**）＋同體驗區間不重疊的約束
      ✅ 同檔建表 ＋ 不重疊的 EXCLUDE 約束（btree_gist）；檔末填入萬鷺朝鳳 8/18–10/11、採茶與紅茶製作兩段可採期
- [x] 1.4 ~~建 view~~ **改為在應用層排序**（design.md D3 已更新）：不建資料庫物件，排序集中在 `src/lib/experience-ordering.ts`
      ✅ 改為應用層排序、不建 view（design.md D3 已更新理由）
- [x] 1.5 RLS：`experience_availability_windows` 需可被前台匿名讀取（季節徽章要用），因此**不是 deny-by-default**——啟用 RLS 並建立 `SELECT` 給 anon 的 policy，寫入僅 service_role
      ✅ 改為「季節區間可公開讀取」policy——徽章要在前台顯示，匿名必須讀得到；寫入仍只有 service_role
- [ ] 1.6 執行前後各查一次 `experience_types`，確認**增欄不改動任何既有列的 id 與其他欄位**
- [x] 1.7 `src/types/index.ts` 的 `ExperienceType` 補 `sortOrder`、`pinnedUntil`、`isInSeason`、`seasonEndsOn`、`daysLeft`
      ✅ 新增 `AvailabilityWindow` 型別；`ExperienceType` 補 sortOrder／pinnedUntil／windows（全選填，SQL 沒跑時是 undefined）

## 2. 排序與季節邏輯

- [x] 2.1 `getExperienceTypes()` 一次查詢帶出季節區間（PostgREST embedded），改呼叫 `sortExperiences()`；**唯一的排序入口**
      ✅ `getExperienceTypes()` 以 PostgREST embedded 帶出季節區間並呼叫 `sortExperiences()`；查詢失敗會退回舊查法而不是回空陣列
- [x] 2.2 `getProducts()` 兩處 `.order("id")` 改為 `.order("sort_order").order("id")`
      ✅ `getProducts()`／`getFeaturedProducts()` 加 sort_order ＋ 42703 退路——**這是實跑 dev server 才抓到的缺陷**，見 2.7
- [x] 2.3 `src/lib/experiences.ts` 新增 `isInSeason()`、`currentWindow()`、`nextWindow()`、`daysLeftInSeason()`，日期一律以台灣時間當日為基準
      ✅ `src/lib/experience-ordering.ts`：taipeiToday／daysBetween／currentWindow／nextWindow／isInSeason／hasSeason／daysLeftInSeason／isPinned／seasonState
- [x] 2.4 排序測試：給定三款體驗（一款釘選中、一款季節中、一款皆非），斷言順序為釘選 → 季節 → sort_order
      ✅ `ordering.test.ts` 6 條：季節置頂、釘選壓過季節、釘選過期、季節結束自動退回、同分依 id、不改動輸入
- [x] 2.5 邊界測試：季節首日、季節末日（剩餘 0 天不得為負）、末日隔天、釘選到期當日與隔日
      ✅ 同檔邊界 5 條：首日／首日前一天／末日（剩 0 天不為負）／末日隔天／多段區間的空窗
- [x] 2.6 時區測試：台灣時間季節首日 07:00（UTC 仍是前一日）時，判定 SHALL 為季節中
      ✅ 同檔時區 3 條：台灣 07:00（UTC 仍前一日）算首日、午夜換日、零填補格式
- [x] 2.7 回歸測試：`sort_order` 全預設、`pinned_until` 全 NULL、季節表為空時，排序結果與依 `id` 排序**完全相同**（這條守住「上線當下前台不變」）
      ✅ 同檔「回歸」條 ＋ 新增 `ordering-fallback.test.ts` 4 條。**反向驗證做過**：UNDEFINED_COLUMN 改成永遠對不上 → 2 條轉紅（expected [] to deeply equal [2,1]），還原後 30 條全綠

## 3. 前台呈現

- [x] 3.1 `messages/zh.json`／`en.json` 新增季節相關文案（徽章、倒數、最後一天、本季已結束、明年見、開放時通知我），兩份鍵齊備
      ✅ `experiences.season` 11 鍵，zh／en 齊備
- [x] 3.2 體驗卡片季節徽章：顯示結束日與剩餘天數；末日當天顯示「最後一天」
      ✅ `src/components/SeasonBadge.tsx`：四種狀態、末日顯示「今天是最後一天」而非「剩 0 天」、日期依語系格式化
- [ ] 3.3 季節外的卡片：保留在列表、標示本季已結束或下一段季節起始、預約按鈕停用
- [ ] 3.4 「開放時通知我」Email 登記入口（**與 `experience-open-class-request` 的需求蒐集共用同一張表；若該 change 尚未實作，本 change 建最小版本並在該 change 沿用**）
- [x] 3.5 首頁體驗區塊與 `/experiences` 列表共用同一個排序來源，不各排各的
      ✅ 查證五個呼叫點（首頁、列表頁、詳細頁、製程頁、sitemap）**都走 `getExperienceTypes()`**，排序天然一致；徽章已掛首頁（只顯示前 3 張，季節中的會自己擠進去）、列表頁卡片、詳細頁 hero
- [x] 3.6 檢查無寫死中文的文案、`alt`、`aria-label`（沿用 `image-alt.test.ts` 的規則）
      ✅ SeasonBadge 的文案與 aria-label 全部取自 messages，無寫死中文
- [ ] 3.7 手機版檢查：徽章與倒數在 375px 不擠壓卡片標題

## 4. 後台

- [x] 4.1 體驗管理頁的排序調整（上移／下移，或拖拉），變更即時反映
      ✅ `/admin/experiences/ordering` 上移／下移；**整份順序重送、後端重新編號**，比跟鄰居交換穩健（不會因兩筆 sort_order 相同而卡住）
- [x] 4.2 釘選 UI：**到期日必填**、不得早於今日、不提供永久釘選；釘選時若有季節中的體驗被壓下去要顯示提示
      ✅ 到期日必填、不得早於今日、無永久釘選；釘選時若有季節中的體驗被壓下去會顯示提示。API 也擋（不只 UI），見 4.5
- [x] 4.3 季節區間維護：新增／編輯／刪除、同體驗區間不得重疊、最後一段結束日距今不到 30 天時顯示續填提醒
      ✅ 新增／刪除季節區間；重疊由 DB 的 EXCLUDE 約束擋下、API 轉成 409「與既有區間重疊」；最後一段結束日距今 <30 天顯示續填提醒
- [ ] 4.4 商品管理頁的 `sort_order` 調整
- [x] 4.5 測試：區間重疊回錯、釘選未填到期日回錯、到期日早於今日回錯
      ✅ `admin-ordering-api.test.ts` 9 條：釘選無到期日／格式錯／過去日期／今天可以／null 取消、區間反序、重疊 409、合法 200、資料表不存在回 503 且點名要跑哪支 SQL。**反向驗證做過**：移除「不得早於今天」→ 該條轉紅（expected 200 to be 400），還原後 39 條全綠

> **4.4（商品排序的後台 UI）未做**：`products.sort_order` 欄位與查詢排序都已就緒，
> 但後台商品頁是 1,035 行的單一 client 元件，加上下移要動的範圍遠大於本次目標。
> 現階段商品順序可直接在 Supabase 改 `sort_order`；UI 另案處理。

## 5. 上線

- [ ] 5.1 業主執行 `add_experience_ordering.sql`，**確認執行後前台列表順序與執行前完全相同**（此時所有新欄位皆為預設值）
- [ ] 5.2 跑 `/verify`（測試＋型別＋lint＋build），lint 0 error
- [ ] 5.3 部署後填入萬鷺朝鳳的季節區間（**依業主確認的日期，現有場次範圍為 8/18–10/11**），確認它立刻排到第一張並顯示倒數
- [ ] 5.4 用瀏覽器實看 `/experiences` 與 `/en/experiences` 兩個語系的卡片順序與徽章文案
- [ ] 5.5 把季節結束當天的行為驗一次（可暫時把區間結束日設為今天，確認顯示「最後一天」，再改回）
- [ ] 5.6 更新 `.claude/WORKLOG.md`；踩到的坑寫進 `.claude/playbooks/lessons.md`
