## ADDED Requirements

### Requirement: Stripe Checkout Session 建立
系統 SHALL 提供 `POST /api/stripe/checkout` 端點，接收與 ECPay checkout 相同的 `CreateOrderRequest` payload，執行後端驗證後建立 Stripe Checkout Session 並回傳 redirect URL。

#### Scenario: 成功建立 Stripe Session
- **WHEN** 已登入使用者送出有效的結帳請求（paymentMethod = "stripe"）
- **THEN** 系統建立 pending 訂單（ecpay_trade_no 前綴 S）、建立 Stripe Checkout Session、回傳 `{ url }` 供前端 redirect

#### Scenario: Stripe 未設定
- **WHEN** 環境變數 `STRIPE_SECRET_KEY` 未設定時收到請求
- **THEN** 系統回傳 HTTP 503 `{ error: "Stripe is not configured" }`

#### Scenario: 後端驗證失敗
- **WHEN** 請求的商品不存在、庫存不足、優惠券無效、或點數不足
- **THEN** 系統回傳對應的 HTTP 400 錯誤，不建立訂單也不建立 Stripe Session

### Requirement: Stripe Webhook 處理付款成功
系統 SHALL 提供 `POST /api/stripe/webhook` 端點，接收 Stripe 的 `checkout.session.completed` 事件，驗證簽章後執行扣庫存、更新訂單狀態、寄送確認信。

#### Scenario: 付款成功 webhook
- **WHEN** Stripe 發送 `checkout.session.completed` 事件且 `payment_status = "paid"`
- **THEN** 系統更新訂單 `payment_status` 為 `"paid"`、執行原子性庫存扣減、寄送訂單確認信

#### Scenario: 簽章驗證失敗
- **WHEN** webhook 請求的 `stripe-signature` 與 `STRIPE_WEBHOOK_SECRET` 不匹配
- **THEN** 系統回傳 HTTP 400，不執行任何訂單更新

#### Scenario: 庫存扣減失敗
- **WHEN** 付款成功但庫存不足（競態條件）
- **THEN** 系統標記訂單為 `stock_issue` 狀態，需人工處理

#### Scenario: 冪等性保證
- **WHEN** 同一筆訂單的 webhook 被重複觸發
- **THEN** 系統僅在 `payment_status = "pending"` 時更新，避免重複處理

### Requirement: Stripe 訂單前綴規則
Stripe 訂單的 `ecpay_trade_no` 欄位 SHALL 使用前綴 `S`（格式：`S${timestamp}`），以區��� ECPay 商品訂單（T）和體驗預約（B）。

#### Scenario: 訂單編號格式
- **WHEN** 透過 Stripe 建立訂單
- **THEN** `ecpay_trade_no` 以 `S` 開頭，最長 20 字元
