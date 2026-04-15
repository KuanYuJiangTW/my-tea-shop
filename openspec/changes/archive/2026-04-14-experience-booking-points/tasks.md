## 1. 資料庫 Schema

- [x] 1.1 在 Supabase 執行 migration：`ALTER TABLE experience_bookings ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS points_discount INTEGER DEFAULT 0;`

## 2. 類型定義

- [x] 2.1 更新 `src/types/index.ts` 的 `ExperienceBooking` interface，新增 `points_used: number` 和 `points_discount: number`

## 3. 體驗結帳積點折抵

- [x] 3.1 更新 `src/app/api/ecpay/experience-checkout/route.ts`：加入 `pointsToUse` 參數驗證（≥200、100 的倍數、不超過餘額、不超過金額 10%），驗證通過後扣點（插入 `type="redeem"` 的 `point_transactions`），並更新 booking 的 `points_used` 和 `points_discount`，實際付款金額扣除折抵金額
- [x] 3.2 更新體驗結帳前端頁面（`src/app/experiences/booking/[sessionId]/`）：加入點數折抵 UI，顯示可用點數、折抵金額、折後應付，並將 `pointsToUse` 傳至 checkout API

## 4. 體驗完成後發放積點

- [x] 4.1 更新 `src/app/api/admin/experience-bookings/[id]/route.ts`：當 `status` 更新為 `completed` 時，查詢是否已有 earn 記錄，若無則計算 `earnPoints = floor((total_price - points_discount) / 10)` 並插入 `point_transactions`（`type="earn"`、`expires_at = now() + 365 days`）

## 5. 取消預約退還點數

- [x] 5.1 更新 `src/app/api/bookings/[id]/cancel/route.ts`（用戶端取消）：計算退款比例後，若 `points_used > 0` 則按相同比例插入退還點數記錄（`type="earn"`、`description="體驗預約取消退還點數"`）
- [x] 5.2 更新 `src/app/api/admin/experience-bookings/[id]/cancel/route.ts`（後台取消）：同上，加入點數退還邏輯

## 6. 驗證測試

- [x] 6.1 本機測試：使用有點數的帳號預約體驗，確認折抵金額正確、點數扣除、結帳完成
- [x] 6.2 本機測試：後台標記體驗完成，確認積點發放至帳戶
- [x] 6.3 本機測試：取消已確認預約，確認按退款比例退還點數
- [x] 6.4 本機測試：取消待付款預約，確認不退還點數
