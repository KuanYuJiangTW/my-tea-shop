## Why

茶藝店已上線運作，預約系統（含候補、取消退款、參加者資料補填）已完整實作，但缺乏規格文件作為後續開發的基準線。本文件為逆向文件化成果，將現有程式碼轉化為規格書，供未來功能迭代參照。

## What Changes

這是一份現況基準線文件，描述已實作的功能，非新功能規劃。

- 預約主流程：選體驗 → 選場次 → 填訂購人資料 → ECPay 付款 → 確認
- 候補名單流程：額滿加入候補 → 系統通知 → 用戶限時確認
- 取消與退款邏輯：待付款取消不退款；已確認取消依時間比例退款
- 參加者資料補填：活動前 5 天截止，需填姓名、身分證、緊急聯絡人
- 體驗提醒 Cron：定期寄送活動提醒 Email
- 後台管理：預約查詢、代為取消、場次管理

## Capabilities

### New Capabilities

- `experience-booking`: 茶藝體驗預約主流程（選場次、填資料、ECPay付款、狀態管理）
- `waitlist`: 候補名單系統（加入候補、通知、限時確認轉正）
- `booking-cancellation`: 取消與退款邏輯（待付款免退款、已確認依規則退款）
- `booking-participants`: 參加者資料補填（活動前 5 天截止）
- `experience-reminders`: 體驗提醒 Cron Job（Email 通知）
- `admin-experience-management`: 後台體驗預約與場次管理

### Modified Capabilities

（本文件為首次建立，無既有規格需更新）

## Impact

**資料表**：experience_types、experience_sessions、experience_bookings、booking_participants、waitlist_entries、experience_reviews

**API 端點**：
- `/api/bookings`（前台預約 CRUD）
- `/api/experience-sessions`、`/api/experiences`（場次查詢）
- `/api/waitlist`、`/api/waitlist/[id]/confirm`（候補）
- `/api/ecpay/experience-checkout`、`/api/ecpay/result`（金流）
- `/api/cron/experience-reminders`（排程提醒）
- `/api/admin/experience-bookings`、`/api/admin/experience-sessions`（後台）

**外部依賴**：ECPay（付款）、Resend（Email）、Supabase（資料庫 + RLS + Trigger）

---

> **備注**：本文件為既有專案的逆向文件化成果，非事前規格書。
> 建立日期：2026-04-08
> 對應 Git commit：4428303（fix: 待付款預約取消不計算退款、不通知候補）
