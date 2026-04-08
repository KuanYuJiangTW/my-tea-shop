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
系統 SHALL 計算 `total_price = price × participantCount`，並設定 `participants_due_at` 為活動日期前 5 天。

#### Scenario: 成功建立預約
- **WHEN** 所有驗證通過
- **THEN** 系統建立 `status = "pending_payment"` 的預約記錄，並回傳 `{ bookingId, totalPrice, sessionDate, startTime, experience }`

### Requirement: ECPay 付款成功後更新預約狀態
系統 SHALL 在收到 ECPay `result` callback 且付款成功時，將預約狀態更新為 `confirmed`。

#### Scenario: ECPay 付款成功回調
- **WHEN** `/api/ecpay/result` 收到付款成功通知，`RtnCode = "1"`
- **THEN** 對應 booking 狀態更新為 `confirmed`，`ecpay_trade_no` 與 `paid_at` 寫入
