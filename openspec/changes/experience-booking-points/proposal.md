## Why

體驗預約目前完全沒有積點整合，與產品訂單相比功能不對等。用戶透過體驗預約消費無法累積會員點數，也無法折抵點數，降低了會員制度的吸引力與一致性。

## What Changes

- 體驗預約結帳時支援使用會員點數折抵金額
- 體驗完成後（後台標記完成）才發放積點，金額計算邏輯與產品訂單一致
- 取消預約時按退款比例退還已折抵的點數（積點因未發放不需處理）
- 待付款或付款後尚未完成體驗期間不發放積點
- 後台管理介面支援標記體驗完成並自動發放積點

## Capabilities

### New Capabilities
- `experience-booking-points`: 體驗預約的積點折抵、累積與取消退還邏輯

### Modified Capabilities
- `experience-booking`: 預約建立流程加入點數折抵參數與驗證
- `booking-cancellation`: 取消時加入按退款比例退還點數邏輯

## Impact

- **資料庫**：`experience_bookings` 表需新增 `points_used`、`points_discount` 欄位
- **API**：
  - `POST /api/bookings`：新增 `pointsToUse` 參數
  - `POST /api/ecpay/experience-checkout`：新增點數折抵驗證與扣點
  - `POST /api/ecpay/return`：體驗預約付款回調不處理積點（等完成後才給）
  - `DELETE /api/bookings/[id]/cancel`：按退款比例退還點數
  - `PATCH /api/admin/experience-bookings/[id]`：標記完成時發放積點
  - `POST /api/admin/experience-bookings/[id]/cancel`：後台取消時退還點數
- **類型定義**：更新 `ExperienceBooking` interface
- **前端**：體驗結帳頁加入點數折抵 UI（與產品訂單結帳頁一致）
