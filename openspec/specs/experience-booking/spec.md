## ADDED Requirements

### Requirement: 使用者必須登入才能預約
系統 SHALL 拒絕未登入使用者的預約請求，回傳 401。

#### Scenario: 未登入用戶嘗試預約
- **WHEN** 未登入使用者呼叫 `POST /api/bookings`
- **THEN** 系統回傳 HTTP 401 `{ error: "請先登入" }`

### Requirement: 建立預約需填寫必要欄位
系統 SHALL 要求 `sessionId`、`participantCount`、`bookerName`、`bookerPhone` 四個欄位。

#### Scenario: 缺少必填欄位
- **WHEN** 請求 body 缺少任一必填欄位
- **THEN** 系統回傳 HTTP 400 `{ error: "缺少必要欄位" }`

### Requirement: 只能預約狀態為 open 的場次
系統 SHALL 拒絕預約狀態非 `open` 的場次。

#### Scenario: 預約已額滿場次
- **WHEN** 使用者嘗試預約 `status = "full"` 的場次
- **THEN** 系統回傳 HTTP 409 `{ error: "此場次已額滿或取消" }`

### Requirement: 預約人數不得超過剩餘名額
系統 SHALL 計算 `max_participants - current_participants` 並拒絕超額請求。

#### Scenario: 請求人數超過剩餘名額
- **WHEN** `participantCount` > 剩餘名額
- **THEN** 系統回傳 HTTP 409，並告知剩餘名額數量

### Requirement: 茶果酒體驗必須確認成年
系統 SHALL 在 `experience_types.requires_adult = true` 時，要求 `adultConfirmed = true`。

#### Scenario: 未確認成年即預約茶果酒
- **WHEN** 預約 `requires_adult = true` 的體驗且 `adultConfirmed` 非 `true`
- **THEN** 系統回傳 HTTP 400 `{ error: "請確認所有參加者均已年滿 18 歲" }`

### Requirement: 建立預約時計算總金額與資料截止日
系統 SHALL 計算 `total_price = price × participantCount`，並設定 `participants_due_at` 為活動日期前 5 天。`total_price` 記錄原始金額；若使用者以點數折抵，實際應付金額為 `total_price - points_discount`，兩者分開記錄。

#### Scenario: 成功建立預約
- **WHEN** 所有驗證通過
- **THEN** 系統建立 `status = "pending_payment"` 的預約記錄，並回傳 `{ bookingId, totalPrice, sessionDate, startTime, experience }`

#### Scenario: 建立預約時使用點數折抵
- **WHEN** 結帳時傳入 `pointsToUse > 0` 且通過驗證
- **THEN** `points_discount = pointsToUse / 100`，ECPay 付款金額為 `total_price - points_discount`，`points_used` 與 `points_discount` 寫入 booking 記錄

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

### Requirement: ECPay 付款成功後更新預約狀態
系統 SHALL 在收到 ECPay `result` callback 且付款成功時，將預約狀態更新為 `confirmed`。

#### Scenario: ECPay 付款成功回調
- **WHEN** `/api/ecpay/result` 收到付款成功通知，`RtnCode = "1"`
- **THEN** 對應 booking 狀態更新為 `confirmed`，`ecpay_trade_no` 與 `paid_at` 寫入

### Requirement: 前台會員中心顯示「已完成」預約狀態
系統 SHALL 在前台會員中心的預約列表中正確顯示 `completed` 狀態，以「已完成」標籤呈現，樣式有別於其他狀態。

#### Scenario: 顯示已完成預約
- **WHEN** 使用者查看帳戶頁面，有一筆預約狀態為 `completed`
- **THEN** 該預約顯示「已完成」綠色標籤，不顯示取消按鈕與補填資料按鈕

#### Scenario: 已完成預約顯示正確金額
- **WHEN** 預約狀態為 `completed` 且 `points_discount > 0`
- **THEN** 顯示金額為 `total_price - points_discount`

#### Scenario: 已完成預約可留下評價
- **WHEN** 預約狀態為 `completed` 且使用者尚未評價
- **THEN** 顯示「評價體驗」按鈕（沿用現有 `isPast && !has_review` 邏輯，`completed` 視為 past）

### Requirement: Participant count input validation

建立體驗預約時，系統 SHALL 驗證 `participantCount` 為正整數且不超過合理上限（50），避免非整數或負數繞過名額檢查並產生負數金額。

#### Scenario: 非正整數人數

- **WHEN** 預約請求的 `participantCount` 非整數、小於 1、或大於 50
- **THEN** 系統 SHALL 回應 HTTP 400「參加人數不正確」，且不建立預約

#### Scenario: 合法人數

- **WHEN** `participantCount` 為 1 至 50 之間的整數，且未超過該場次剩餘名額
- **THEN** 系統 SHALL 以 `單價 × 人數` 計算金額並建立預約
