## MODIFIED Requirements

### Requirement: 建立預約時計算總金額與資料截止日
系統 SHALL 計算 `total_price = price × participantCount`，並設定 `participants_due_at` 為活動日期前 5 天。`total_price` 記錄原始金額；若使用者以點數折抵，實際應付金額為 `total_price - points_discount`，兩者分開記錄。

#### Scenario: 成功建立預約
- **WHEN** 所有驗證通過
- **THEN** 系統建立 `status = "pending_payment"` 的預約記錄，並回傳 `{ bookingId, totalPrice, sessionDate, startTime, experience }`

#### Scenario: 建立預約時使用點數折抵
- **WHEN** 結帳時傳入 `pointsToUse > 0` 且通過驗證
- **THEN** `points_discount = pointsToUse / 100`，ECPay 付款金額為 `total_price - points_discount`，`points_used` 與 `points_discount` 寫入 booking 記錄

## ADDED Requirements

### Requirement: 帳戶頁面顯示預約應付金額（扣除點數折抵後）
使用者帳戶頁面的預約清單 SHALL 以 `total_price - points_discount` 作為顯示金額，反映實際應付或已付金額，不得顯示折抵前的原始金額。

#### Scenario: 有點數折抵的 pending_payment 預約
- **WHEN** 使用者查看帳戶頁面，預約狀態為 `pending_payment` 且 `points_discount > 0`
- **THEN** 顯示金額為 `total_price - points_discount`（NT$ 格式）

#### Scenario: 有點數折抵的 confirmed 預約
- **WHEN** 使用者查看帳戶頁面，預約狀態為 `confirmed` 且 `points_discount > 0`
- **THEN** 顯示金額為 `total_price - points_discount`（NT$ 格式）

#### Scenario: 無點數折抵的預約
- **WHEN** 使用者查看帳戶頁面，`points_discount = 0`
- **THEN** 顯示金額為 `total_price`（行為與修改前相同）

### Requirement: 體驗完成後積點發放防止重複
系統 SHALL 在後台將預約標記為 `completed` 時，先查詢是否已存在 `type = "earn"` 且對應同一 `booking_id` 的積點記錄，若已存在則不重複發放。

#### Scenario: 首次標記 completed
- **WHEN** 後台 PATCH 預約狀態為 `completed` 且尚無對應 earn 記錄
- **THEN** 插入 `point_transactions`（`type = "earn"`，`points = floor((total_price - points_discount) / 10)`，`expires_at = now() + 365 days`）

#### Scenario: 重複標記 completed
- **WHEN** 後台再次 PATCH 預約狀態為 `completed` 且已有對應 earn 記錄
- **THEN** 不插入新的積點記錄，回傳 HTTP 200

### Requirement: 取消預約按退款比例退還點數
系統 SHALL 在取消有點數折抵的預約時，依退款比例計算退還點數（`refundPoints = floor(points_used × refundRatio)`），並插入 `type = "earn"` 的還原記錄。

#### Scenario: 用戶取消已確認預約（有點數折抵）
- **WHEN** 用戶呼叫取消 API，預約狀態為 `confirmed` 且 `points_used > 0`
- **THEN** 依退款比例計算退還點數，插入 `{ points: +refundPoints, type: "earn", description: "體驗預約取消退還點數" }`

#### Scenario: 後台取消預約（有點數折抵）
- **WHEN** 管理員呼叫後台取消 API 且 `points_used > 0`
- **THEN** 依退款比例計算退還點數，插入退還記錄

#### Scenario: 取消待付款預約
- **WHEN** 預約狀態為 `pending_payment` 被取消且 `points_used > 0`
- **THEN** 金錢退款為 0（未付款），但點數全額退還（`refundPoints = points_used`），插入 `{ points: +points_used, type: "earn", description: "體驗預約取消退還點數" }`
