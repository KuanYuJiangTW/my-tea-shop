## ADDED Requirements

### Requirement: 只有訂單本人可以操作
系統 SHALL 驗證 `order.user_id === user.id`，否則回傳 403。

#### Scenario: 他人嘗試操作訂單
- **WHEN** 使用者操作不屬於自己的訂單
- **THEN** 系統回傳 HTTP 403

### Requirement: 只有 new 狀態的訂單可以取消
系統 SHALL 拒絕 `new` 以外狀態的取消請求。

#### Scenario: 取消處理中訂單
- **WHEN** `order_status = "preparing"` 或更後期狀態
- **THEN** 系統回傳 HTTP 400 `{ error: "此訂單狀態無法取消，若有需要請聯絡客服" }`

### Requirement: 取消時依付款方式決定是否還原庫存
系統 SHALL 依以下規則還原庫存：
- COD（非 ECPay）訂單：下單即扣庫存，取消時還原
- ECPay 訂單未付款（`payment_status != "paid"`）：尚未扣庫存，取消時不需還原
- ECPay 訂單已付款：已扣庫存，取消時需還原

#### Scenario: COD 訂單取消
- **WHEN** `payment_method !== "ecpay"`，訂單取消成功
- **THEN** 呼叫 `increment_stock` RPC 還原每個品項的庫存

#### Scenario: ECPay 未付款訂單取消
- **WHEN** `payment_method = "ecpay"` 且 `payment_status !== "paid"`
- **THEN** 不還原庫存

### Requirement: 宅配地址可在出貨前修改
系統 SHALL 允許 `order_status` 為 `new` 或 `preparing` 的宅配訂單修改收件地址。

#### Scenario: 成功修改宅配地址
- **WHEN** `PATCH /api/orders/[id]/address`，`city` 與 `address` 均已填寫
- **THEN** `shipping_address.city` 與 `shipping_address.address` 更新

#### Scenario: 訂單已出貨，無法修改地址
- **WHEN** `order_status` 非 `new` / `preparing`
- **THEN** 系統回傳 HTTP 400 `{ error: "訂單已出貨，無法修改地址" }`

#### Scenario: 超商取貨訂單不可線上修改地址
- **WHEN** `shipping_address.type = "cvs"`
- **THEN** 系統回傳 HTTP 400 `{ error: "超商取貨地址無法線上修改，請聯絡客服" }`

### Requirement: 可查詢商品即時庫存
系統 SHALL 提供 `GET /api/products/stock`，回傳所有上架商品的三種規格庫存數量。

#### Scenario: 查詢商品庫存
- **WHEN** 呼叫 `GET /api/products/stock`
- **THEN** 回傳 `[{ id, stockQuantity, stock75g, stockTeaBag }]`（僅 `is_active = true` 的商品）
