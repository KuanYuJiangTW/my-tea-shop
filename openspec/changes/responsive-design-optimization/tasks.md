## 1. 後台預約管理（AdminBookingsClient.tsx）

- [x] 1.1 搜尋輸入框：`w-56` → `w-full sm:w-56`
- [x] 1.2 表格容器：在 `<table>` 外加 `<div className="overflow-x-auto">`（已存在，無需修改）
- [x] 1.3 刪除確認 Modal：`mx-4` → `mx-2 sm:mx-4`（已有 px-4 外層保護，無需修改）

## 2. 後台場次管理（SessionsClient.tsx）

- [x] 2.1 篩選欄 grid：`sm:grid-cols-4` → `grid-cols-2 md:grid-cols-4`
- [x] 2.2 表格容器：在 `<table>` 外加 `<div className="overflow-x-auto">`

## 3. 後台產品管理（ProductsClient.tsx）

- [x] 3.1 刪除確認 Modal：`mx-4` → `mx-2 sm:mx-4`
- [x] 3.2 規格顯示區（非編輯狀態）：已有 `flex flex-wrap`，換行正常，無需修改

## 4. 後台月曆（AdminCalendarClient.tsx）

- [x] 4.1 月曆格子最小高度：`min-h-[80px]` → `min-h-[60px] sm:min-h-[80px]`
- [x] 4.2 圖例間距：`gap-4` → `gap-2 sm:gap-4`

## 5. 前台相簿（ExperienceGallery.tsx）

- [x] 5.1 縮圖格線：`grid-cols-3` → `grid-cols-2 sm:grid-cols-3`
- [x] 5.2 `sizes` 屬性更新：配合新格線調整

## 6. 前台預約流程（BookingFlow.tsx）

- [x] 6.1 場次摘要：`grid-cols-3` → `grid-cols-1 md:grid-cols-3`
- [x] 6.2 特殊需求複選框：`flex gap-4` → `flex flex-col sm:flex-row gap-2 sm:gap-4`

## 7. 前台體驗日曆（ExperienceCalendar.tsx）

- [x] 7.1 圖例區塊：加 `flex-wrap`，間距 `gap-2 sm:gap-4`
