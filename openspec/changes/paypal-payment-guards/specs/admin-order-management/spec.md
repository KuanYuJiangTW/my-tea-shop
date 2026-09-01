## ADDED Requirements

### Requirement: 線上金流未付款不得推進訂單狀態

系統 SHALL 拒絕推進未付款線上金流訂單的 `order_status`。具體而言，`payment_method`
不等於 `cod` 且 `payment_status` 不為 `paid` 時，不得轉為 `preparing`、`shipped`、
`delivered` 或 `completed`。

限制的理由是兩件事同時成立：線上金流是**付款成功才扣庫存**，未付款就出貨會讓帳面
與實體同時錯；而 `preparing` 之後客人失去自助取消能力（`CANCELLABLE_STATUSES`
只含 `new`），等於把未完成付款的客人鎖住。

`cancelled` 不受此限制——取消未付款訂單是正常且應該保留的操作。

貨到付款（`payment_method = "cod"`）不受此限制，COD 本來就是先出貨後收款。

#### Scenario: 未付款的 PayPal 訂單嘗試出貨
- **WHEN** `PATCH /api/admin/orders/[id]` 對 `payment_method = "paypal"` 且
  `payment_status = "pending"` 的訂單傳入 `orderStatus: "shipped"`
- **THEN** 回傳 HTTP 409 與錯誤訊息，說明此訂單尚未付款
- **THEN** SHALL NOT 更新訂單狀態
- **THEN** SHALL NOT 寄送出貨通知 Email

#### Scenario: 未付款的線上訂單嘗試備貨
- **WHEN** 對 `payment_status = "pending"` 的非 COD 訂單傳入 `orderStatus: "preparing"`
- **THEN** 回傳 HTTP 409，不更新狀態

#### Scenario: 同一請求同時標記已付款
- **WHEN** 請求同時傳入 `paymentStatus: "paid"` 與 `orderStatus: "shipped"`
- **THEN** 以請求中的付款狀態為準，允許推進

#### Scenario: 貨到付款不受限制
- **WHEN** 對 `payment_method = "cod"` 且 `payment_status = "pending"` 的訂單
  傳入 `orderStatus: "shipped"`
- **THEN** 正常更新狀態並寄送出貨通知

#### Scenario: 取消未付款訂單不受限制
- **WHEN** 對未付款的線上訂單傳入 `orderStatus: "cancelled"`
- **THEN** 正常取消並執行既有的還原流程

### Requirement: 後台對未付款線上訂單只顯示取消動作

訂單詳情頁 SHALL 依付款狀態決定可用動作。線上金流訂單未付款時，SHALL NOT 顯示
任何推進狀態的按鈕（「開始備貨」「確認出貨」「標記完成」），SHALL 顯示說明文字
告知尚未收到付款，並 SHALL 保留「取消訂單」。

#### Scenario: 未付款的 PayPal 訂單
- **WHEN** 檢視 `payment_method = "paypal"`、`payment_status = "pending"` 的訂單
- **THEN** 只顯示「取消訂單」與尚未收到付款的說明，不顯示推進按鈕

#### Scenario: 已付款的 PayPal 訂單
- **WHEN** 檢視 `payment_status = "paid"` 的訂單
- **THEN** 依 `order_status` 顯示既有的推進按鈕

#### Scenario: 未付款的貨到付款訂單
- **WHEN** 檢視 `payment_method = "cod"`、`payment_status = "pending"` 的訂單
- **THEN** 顯示既有的推進按鈕（COD 先出貨後收款）
