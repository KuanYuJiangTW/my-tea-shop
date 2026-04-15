## ADDED Requirements

### Requirement: 體驗結帳時可使用會員點數折抵金額
系統 SHALL 在 `POST /api/ecpay/experience-checkout` 接受 `pointsToUse` 參數，並依與產品訂單相同的規則驗證後執行扣點。

#### Scenario: 點數折抵驗證通過
- **WHEN** `pointsToUse` 符合：≥ 200、100 的倍數、不超過帳戶餘額、不超過訂單金額 10%
- **THEN** 從 `point_transactions` 插入 `type = "redeem"` 記錄，`booking_id` 記錄對應預約，`amount = -pointsToUse`，實際付款金額 = `total_price - pointsDiscount`

#### Scenario: 點數不足
- **WHEN** `pointsToUse` 超過帳戶可用點數餘額
- **THEN** 系統回傳 HTTP 400 `{ error: "點數不足" }`

#### Scenario: 折抵金額超過上限
- **WHEN** `pointsToUse × 0.1 > total_price × 0.1`（即折抵超過訂單金額 10%）
- **THEN** 系統回傳 HTTP 400 `{ error: "點數折抵不得超過訂單金額的 10%" }`

#### Scenario: 未使用點數
- **WHEN** `pointsToUse` 為 0 或未傳入
- **THEN** 正常建立結帳，不扣點數，`experience_bookings.points_used = 0`

### Requirement: 體驗完成後發放積點
系統 SHALL 在後台將預約狀態標記為 `completed` 時，檢查是否已發放積點，若未發放則計算並寫入積點。

#### Scenario: 首次標記完成發放積點
- **WHEN** 後台 `PATCH /api/admin/experience-bookings/[id]` 將 `status` 更新為 `completed`，且該預約無 `type = "earn"` 的點數記錄
- **THEN** 計算 `earnPoints = floor((total_price - points_discount) / 10)`，插入 `point_transactions`（`type = "earn"`、`booking_id`、`expires_at = now() + 365 days`）

#### Scenario: 重複標記完成不重複發點
- **WHEN** 後台再次將已 `completed` 的預約標記為 `completed`，且該預約已有 earn 記錄
- **THEN** 系統不再插入新的點數記錄，回傳正常成功回應

#### Scenario: 取消或 pending_payment 狀態不發點
- **WHEN** 預約狀態為 `cancelled` 或 `pending_payment`
- **THEN** 系統不發放任何積點

### Requirement: experience_bookings 記錄點數折抵資訊
系統 SHALL 在 `experience_bookings` 表儲存 `points_used`（折抵點數數量）與 `points_discount`（折抵金額，單位：元）。

#### Scenario: 有折抵時記錄欄位
- **WHEN** 結帳時使用點數折抵
- **THEN** `experience_bookings.points_used` 記錄折抵點數數量，`points_discount` 記錄對應折抵金額

#### Scenario: 無折抵時欄位預設為 0
- **WHEN** 結帳時未使用點數
- **THEN** `points_used = 0`、`points_discount = 0`
