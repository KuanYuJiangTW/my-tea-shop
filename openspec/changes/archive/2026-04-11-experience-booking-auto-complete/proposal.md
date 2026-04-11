## Why

體驗預約積點系統已實作完成，但目前缺少將預約標記為「已完成」的機制——積點無法自動發放給參加過活動的會員。需要一套「人工優先，自動兜底」的完成流程：活動結束後管理員可手動標記完成；若 7 天內未處理，Cron Job 自動完成並發放積點。

## What Changes

- **新增** Vercel Cron Job：每日掃描活動已過超過 7 天、狀態仍為 `confirmed` 的預約，自動標記為 `completed` 並發放積點
- **新增** 後台「標記完成」按鈕：活動時間已過的 `confirmed` 預約顯示此按鈕，管理員可立即手動完成
- **新增** 後台「已完成」篩選 tab：讓管理員可查看所有已完成的預約
- **新增** 後台活動已過提示：活動日期已過但尚未完成的預約以視覺方式標示，提醒管理員處理
- **修改** 前台會員中心：顯示「已完成」預約狀態，並適當呈現積點發放資訊

## Capabilities

### New Capabilities

- `experience-booking-completion`: 體驗預約完成流程——手動標記與自動完成機制、積點觸發規則

### Modified Capabilities

- `experience-booking`: 預約狀態新增 `completed`，前台會員中心需顯示此狀態

## Impact

- `src/app/admin/(protected)/experiences/bookings/AdminBookingsClient.tsx` — 新增標記完成按鈕、已完成 tab、已過期視覺提示
- `src/app/api/admin/experience-bookings/[id]/route.ts` — 已有 completed 狀態的 PATCH 邏輯，確認可直接使用
- `src/app/account/AccountClient.tsx` — 新增 completed 狀態標籤與顯示邏輯
- `src/app/account/page.tsx` — Supabase query 需包含 completed 狀態
- `vercel.json` — 新增 Cron Job 設定
- `src/app/api/cron/complete-bookings/route.ts` — 新建 Cron Job API route
