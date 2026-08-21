# 任務：體驗卡片的季節排序

> **動手前先讀** 本 change 的 `design.md`，以及 `openspec/changes/experience-open-class-request/design.md`
> 的 D11——`experience_availability_windows` 是兩個 change 共用的同一張表，**誰先實作誰建表**。
>
> **不是高風險區**（不碰金流、庫存、auth、RLS、cron），但**絕對不可改任何 `id`**：
> `experience_sessions`、`experience_bookings`、`experience_reviews` 三張表以外鍵指著
> `experience_types.id`。任務 1.1 之前先讀 `supabase/booking_schema.sql` 確認外鍵關係。

## 1. 資料層

- [ ] 1.1 寫 `supabase/add_experience_ordering.sql`：`experience_types` 增欄 `sort_order INTEGER NOT NULL DEFAULT 100`、`pinned_until DATE`（`ADD COLUMN IF NOT EXISTS`）
- [ ] 1.2 同檔 `products` 增欄 `sort_order INTEGER NOT NULL DEFAULT 100`
- [ ] 1.3 同檔建 `experience_availability_windows`（`experience_type_id`、`start_date`、`end_date`、`note`；`CREATE TABLE IF NOT EXISTS`，**若 `experience-open-class-request` 已建則此步為 no-op**）＋同體驗區間不重疊的約束
- [ ] 1.4 同檔建 view `experience_types_ordered`：帶 `is_in_season`、`season_ends_on`、`days_left` 三個衍生欄位，排序鍵為 `(釘選中, 季節中, sort_order, id)`；**日期一律用 `(now() AT TIME ZONE 'Asia/Taipei')::date`**，不可用 `CURRENT_DATE`
- [ ] 1.5 RLS：新表 deny-by-default（比照 `web_inquiries`）；view 的讀取權限與 `experience_types` 一致
- [ ] 1.6 執行前後各查一次 `experience_types`，確認**增欄不改動任何既有列的 id 與其他欄位**
- [ ] 1.7 `src/types/index.ts` 的 `ExperienceType` 補 `sortOrder`、`pinnedUntil`、`isInSeason`、`seasonEndsOn`、`daysLeft`

## 2. 排序與季節邏輯

- [ ] 2.1 `getExperienceTypes()` 改讀 `experience_types_ordered` view，移除 `.order("id")`
- [ ] 2.2 `getProducts()` 兩處 `.order("id")` 改為 `.order("sort_order").order("id")`
- [ ] 2.3 `src/lib/experiences.ts` 新增 `isInSeason()`、`currentWindow()`、`nextWindow()`、`daysLeftInSeason()`，日期一律以台灣時間當日為基準
- [ ] 2.4 排序測試：給定三款體驗（一款釘選中、一款季節中、一款皆非），斷言順序為釘選 → 季節 → sort_order
- [ ] 2.5 邊界測試：季節首日、季節末日（剩餘 0 天不得為負）、末日隔天、釘選到期當日與隔日
- [ ] 2.6 時區測試：台灣時間季節首日 07:00（UTC 仍是前一日）時，判定 SHALL 為季節中
- [ ] 2.7 回歸測試：`sort_order` 全預設、`pinned_until` 全 NULL、季節表為空時，排序結果與依 `id` 排序**完全相同**（這條守住「上線當下前台不變」）

## 3. 前台呈現

- [ ] 3.1 `messages/zh.json`／`en.json` 新增季節相關文案（徽章、倒數、最後一天、本季已結束、明年見、開放時通知我），兩份鍵齊備
- [ ] 3.2 體驗卡片季節徽章：顯示結束日與剩餘天數；末日當天顯示「最後一天」
- [ ] 3.3 季節外的卡片：保留在列表、標示本季已結束或下一段季節起始、預約按鈕停用
- [ ] 3.4 「開放時通知我」Email 登記入口（**與 `experience-open-class-request` 的需求蒐集共用同一張表；若該 change 尚未實作，本 change 建最小版本並在該 change 沿用**）
- [ ] 3.5 首頁體驗區塊與 `/experiences` 列表共用同一個排序來源，不各排各的
- [ ] 3.6 檢查無寫死中文的文案、`alt`、`aria-label`（沿用 `image-alt.test.ts` 的規則）
- [ ] 3.7 手機版檢查：徽章與倒數在 375px 不擠壓卡片標題

## 4. 後台

- [ ] 4.1 體驗管理頁的排序調整（上移／下移，或拖拉），變更即時反映
- [ ] 4.2 釘選 UI：**到期日必填**、不得早於今日、不提供永久釘選；釘選時若有季節中的體驗被壓下去要顯示提示
- [ ] 4.3 季節區間維護：新增／編輯／刪除、同體驗區間不得重疊、最後一段結束日距今不到 30 天時顯示續填提醒
- [ ] 4.4 商品管理頁的 `sort_order` 調整
- [ ] 4.5 測試：區間重疊回錯、釘選未填到期日回錯、到期日早於今日回錯

## 5. 上線

- [ ] 5.1 業主執行 `add_experience_ordering.sql`，**確認執行後前台列表順序與執行前完全相同**（此時所有新欄位皆為預設值）
- [ ] 5.2 跑 `/verify`（測試＋型別＋lint＋build），lint 0 error
- [ ] 5.3 部署後填入萬鷺朝鳳的季節區間（**依業主確認的日期，現有場次範圍為 8/18–10/11**），確認它立刻排到第一張並顯示倒數
- [ ] 5.4 用瀏覽器實看 `/experiences` 與 `/en/experiences` 兩個語系的卡片順序與徽章文案
- [ ] 5.5 把季節結束當天的行為驗一次（可暫時把區間結束日設為今天，確認顯示「最後一天」，再改回）
- [ ] 5.6 更新 `.claude/WORKLOG.md`；踩到的坑寫進 `.claude/playbooks/lessons.md`
