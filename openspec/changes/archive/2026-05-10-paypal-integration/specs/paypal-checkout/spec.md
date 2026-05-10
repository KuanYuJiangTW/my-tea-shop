## ADDED Requirements

### Requirement: PayPal Order 建立
系統 SHALL 提供 `/api/paypal/create-order` POST 端點，接收與 Stripe checkout 相同的 `CreateOrderRequest` body（含 `pointsToUse` 和 `couponCode`），在資料庫建立 pending 訂單（含 `paypal_order_id` 欄位）後，呼叫 PayPal Orders API 建立訂單並回傳 approve URL。

點數與折價券在 **create-order 時即扣除**（與 Stripe/ECPay 流程一致），不等 capture 成功才扣。

#### Scenario: 成功建立 PayPal Order
- **WHEN** 已登入使用者 POST 有效的結帳資料至 `/api/paypal/create-order`
- **THEN** 系統驗證點數（最低 200 點、100 倍數、不超過訂單金額 10%）與折價券，扣除點數（insert point_transactions type: "redeem"）與標記折價券已用，建立 pending 訂單，呼叫 PayPal Create Order API（設定 `return_url = ${BASE_URL}/order/result?paypal=success`，`cancel_url = ${BASE_URL}/order/result?paypal=cancel&orderId=${dbOrderId}`），將 PayPal Order ID 存入 DB，回傳 JSON `{ url: "<paypal-approve-url>", orderId: "<db-order-id>" }`

> **URL 組成說明**：`return_url` 和 `cancel_url` 在後端建立 PayPal Order 時即設定好。PayPal 會在 return_url 自動附加 `&token=<paypal-order-id>` 參數。前端收到 `{ url }` 後直接 redirect，不需要自行組 URL。

#### Scenario: 未登入使用者
- **WHEN** 未登入使用者 POST 至 `/api/paypal/create-order`
- **THEN** 回傳 401 錯誤

#### Scenario: PayPal 未設定
- **WHEN** 環境變數 `PAYPAL_CLIENT_ID` 或 `PAYPAL_CLIENT_SECRET` 未設定
- **THEN** 回傳 503 錯誤 "PayPal is not configured"

#### Scenario: 金額低於最低限制
- **WHEN** 訂單總金額低於 NT$32（PayPal 最低限制約 US$1）
- **THEN** 回傳 400 錯誤 "PayPal minimum payment amount is NT$32"

#### Scenario: PayPal API 建立失敗回滾
- **WHEN** DB 訂單已建立但 PayPal Create Order API 呼叫失敗
- **THEN** 將 DB 訂單標記為 `order_status: "failed"`，回滾已扣除的折價券（將 `used_at` 設回 null）與點數（insert point_transactions type: "earn" 正數退回），回傳 500 錯誤

#### Scenario: 點數驗證失敗
- **WHEN** `pointsToUse` 不符合規則（< 200、非 100 倍數、超過餘額、超過訂單金額 10%）
- **THEN** 回傳 400 錯誤，不建立訂單

#### Scenario: TWD 幣別不支援
- **WHEN** PayPal API 回傳幣別相關錯誤（如買家帳號不支援 TWD）
- **THEN** 回傳 400 錯誤，訊息引導使用者改用其他付款方式

### Requirement: PayPal 付款捕獲
系統 SHALL 提供 `/api/paypal/capture` POST 端點，驗證當前使用者身份後，呼叫 PayPal Capture API 完成付款並更新訂單狀態。

#### Scenario: 成功捕獲付款
- **WHEN** 已登入使用者 POST `{ paypalOrderId: "<paypal-order-id>" }` 至 `/api/paypal/capture`
- **THEN** 系統驗證該 PayPal Order ID 對應的 DB 訂單屬於當前使用者，呼叫 PayPal Capture Order API，付款成功則更新訂單 `payment_status` 為 "paid"（`order_status` 維持 "new"，由管理員手動改為 "preparing"，與 Stripe/ECPay 一致），扣除庫存，並觸發訂單確認 email，回傳 `{ success: true, dbOrderId: "<db-order-id>" }`

#### Scenario: 捕獲失敗
- **WHEN** PayPal Capture API 回傳錯誤
- **THEN** 回傳 400 錯誤，訂單狀態維持 pending，已扣除的點數與折價券保留不退（使用者可透過「重新付款」再試，或取消訂單退回點數）

#### Scenario: 重複捕獲（冪等處理）
- **WHEN** 訂單 `payment_status` 已為 "paid"（Result 頁面與 Webhook 競態）
- **THEN** 直接回傳 `{ success: true, dbOrderId }` 不重複處理，不重複寄信

#### Scenario: 未授權存取
- **WHEN** 使用者嘗試 capture 不屬於自己的訂單
- **THEN** 回傳 403 錯誤 "Forbidden"

#### Scenario: 未登入
- **WHEN** 未登入使用者 POST 至 `/api/paypal/capture`
- **THEN** 回傳 401 錯誤

> **實作備註**：capture 端點須使用 DB 行鎖（如 Supabase RPC 或 SELECT ... FOR UPDATE 語意）確保 Result 頁面與 Webhook 同時觸發 capture 時不會競態。應加上 rate limiting（20 req/min per IP，與 /api/orders 一致）。

### Requirement: PayPal Webhook 處理
系統 SHALL 提供 `/api/paypal/webhook` POST 端點，接收 PayPal webhook 通知並驗證簽章後更新訂單狀態。須具備 idempotency 檢查防止重複處理。

#### Scenario: CHECKOUT.ORDER.APPROVED 事件
- **WHEN** 收到已驗證的 `CHECKOUT.ORDER.APPROVED` webhook
- **THEN** 若訂單尚未 captured，**直接呼叫 PayPal Capture API**（不經過 `/api/paypal/capture` 端點，因 webhook 無使用者 session），更新訂單狀態、扣庫存、寄信

#### Scenario: PAYMENT.CAPTURE.COMPLETED 事件
- **WHEN** 收到已驗證的 `PAYMENT.CAPTURE.COMPLETED` webhook
- **THEN** 更新對應訂單的 `payment_status` 為 "paid"（`order_status` 維持 "new"），扣庫存（若尚未扣），並觸發訂單確認 email（若尚未發送）

> **實作備註**：Webhook handler 和 `/api/paypal/capture` 端點應共用核心處理函式（冪等檢查、DB 更新、扣庫存、寄信），差異僅在 auth 層 — capture 端點驗證使用者身份，webhook handler 驗證 PayPal 簽章。建議在 `src/lib/paypal.ts` 中抽出 `processPayPalCapture(orderId)` 共用函式。

#### Scenario: 重複事件（Idempotency）
- **WHEN** 收到已處理過的 webhook 事件（相同 capture ID）
- **THEN** 回傳 200，不重複更新訂單狀態

#### Scenario: 簽章驗證失敗
- **WHEN** webhook 簽章驗證失敗
- **THEN** 回傳 401，不處理任何訂單更新

### Requirement: PayPal 重新付款
系統 SHALL 提供 `/api/paypal/retry` POST 端點，針對已建立但未完成付款的訂單，重新建立 PayPal Order 並回傳新的 approve URL。不重複扣除點數與折價券。

#### Scenario: 成功重新建立 PayPal Order
- **WHEN** 已登入使用者 POST `{ orderId: "<db-order-id>" }` 至 `/api/paypal/retry`
- **THEN** 系統驗證該訂單屬於當前使用者且 `payment_status` 為 "pending"，重新呼叫 PayPal Create Order API，更新 DB 的 `paypal_order_id` 為新值，回傳 `{ url: "<new-approve-url>" }`
- **注意** 不重複扣除點數與折價券（create-order 時已扣）

#### Scenario: 訂單已付款
- **WHEN** 訂單 `payment_status` 已為 "paid"
- **THEN** 回傳 400 錯誤 "訂單已完成付款"

#### Scenario: 訂單不屬於當前使用者
- **WHEN** 使用者嘗試 retry 不屬於自己的訂單
- **THEN** 回傳 403 錯誤

#### Scenario: 訂單已取消
- **WHEN** 訂單 `order_status` 為 "cancelled" 或 "failed"
- **THEN** 回傳 400 錯誤 "此訂單無法重新付款"

### Requirement: PayPal 訂單取消與點數退還
使用者透過現有的 `/api/orders/[id]/cancel` 取消 PayPal pending 訂單時，系統自動退還已扣除的點數（與現有 COD/Stripe 取消邏輯一致，無需額外開發）。

> **備註**：現有 cancel 端點已處理點數退還（insert point_transactions type: "earn"）和折價券回滾，PayPal 訂單的 `order_status` 為 "new" 時可直接使用此端點。

### Requirement: PayPal Access Token 管理
系統 SHALL 使用 PayPal OAuth2 Client Credentials 取得 access token，並快取至過期前。

#### Scenario: 取得 access token
- **WHEN** 任何 PayPal API 呼叫需要認證
- **THEN** 使用 `PAYPAL_CLIENT_ID` 和 `PAYPAL_CLIENT_SECRET` 向 PayPal OAuth2 端點取得 token

### Requirement: PayPal 環境變數
系統 SHALL 支援以下環境變數：`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`、`PAYPAL_WEBHOOK_ID`、`PAYPAL_MODE`。

#### Scenario: Sandbox vs Production
- **WHEN** `PAYPAL_MODE` 未設定或為 "sandbox"
- **THEN** API 呼叫指向 `https://api-m.sandbox.paypal.com`
- **WHEN** `PAYPAL_MODE` 為 "live"
- **THEN** API 呼叫指向 `https://api-m.paypal.com`

### Requirement: PayPal Order ID 資料庫儲存
系統 SHALL 在 orders 表中記錄 PayPal Order ID，以便 capture 時查詢對應訂單與驗證擁有權。

#### Scenario: 建立訂單時儲存
- **WHEN** create-order 成功取得 PayPal Order ID
- **THEN** 將 PayPal Order ID 存入該訂單的 `paypal_order_id` 欄位
