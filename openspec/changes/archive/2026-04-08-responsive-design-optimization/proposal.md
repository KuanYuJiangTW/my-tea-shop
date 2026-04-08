## Why

前台茶山體驗頁面與後台管理頁面在行動裝置（手機 375px、小平板 640px）上存在表格水平溢出、欄位過擠、按鈕觸控區域不足等問題，影響使用體驗。尤其後台管理（預約列表、場次管理）多數情況會在現場用手機操作，RWD 品質至關重要。

## What Changes

**後台管理頁面：**
- `AdminBookingsClient.tsx`：搜尋框改為全寬、表格加 overflow 包裝、Modal 寬度修正
- `SessionsClient.tsx`：篩選欄改為 2 欄 → 4 欄漸進、表格加 overflow 包裝
- `ProductsClient.tsx`：刪除 Modal 寬度修正、規格區換行優化
- `AdminCalendarClient.tsx`：月曆格子高度響應式、圖例間距修正

**前台體驗頁面：**
- `ExperienceGallery.tsx`：相簿改為 `grid-cols-2 sm:grid-cols-3`
- `BookingFlow.tsx`：場次摘要 3 欄改為 1 欄 → 3 欄、特殊需求 flex 改為 flex-col
- `ExperienceCalendar.tsx`：圖例加 flex-wrap

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `admin-product-management`：後台產品管理 RWD 修正（Modal、規格區）
- `experience-booking`：預約流程 RWD 修正（摘要欄、勾選區）
- `experience-detail`：體驗詳細頁 RWD 修正（相簿格線）

## Impact

- 7 個 tsx 檔案的 Tailwind class 調整
- 無 API、資料庫、型別異動
