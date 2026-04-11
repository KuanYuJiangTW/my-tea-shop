## Why

體驗預約積點系統（2.1–5.2）已完成實作，但尚未通過端對端驗證測試；同時發現一個正確性 bug：待結帳（`pending_payment`）與已確認（`confirmed`）的預約在前端顯示的訂單金額，未扣除會員點數折抵金額（`points_discount`），導致用戶看到的金額與實際付款金額不符，且可能造成點數核算錯誤。

## What Changes

- **修正** 體驗預約訂單金額顯示：前端列表／詳情頁改以 `total_price - points_discount` 作為顯示金額
- **驗證** 點數折抵結帳流程（API 驗證、扣點、booking 欄位更新）
- **驗證** 體驗完成後積點發放（防重複邏輯）
- **驗證** 用戶取消與後台取消的按比例退還點數邏輯
- **確認** `ExperienceBooking` interface 的 `points_used` / `points_discount` 欄位已正確對應 DB schema

## Capabilities

### New Capabilities

（無新增能力）

### Modified Capabilities

- `experience-booking`：訂單顯示金額需反映點數折抵後的實際應付金額（`total_price - points_discount`）；pending_payment 和 confirmed 狀態的預約皆須套用此計算

## Impact

- `src/app/experiences/booking/` — 預約列表／詳情顯示金額邏輯
- `src/app/account/` — 帳戶頁面的訂單歷史顯示
- `src/app/api/ecpay/experience-checkout/route.ts` — 驗證點數折抵邏輯
- `src/app/api/admin/experience-bookings/[id]/route.ts` — 驗證積點發放邏輯
- `src/app/api/bookings/[id]/cancel/route.ts` — 驗證退還點數邏輯
- `src/app/api/admin/experience-bookings/[id]/cancel/route.ts` — 驗證退還點數邏輯
