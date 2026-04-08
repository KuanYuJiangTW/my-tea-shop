## ADDED Requirements

### Requirement: 後台可查詢所有訂單列表
系統 SHALL 提供 `GET /api/admin/orders`，回傳所有訂單依 `created_at` 降序排列。

#### Scenario: 查詢訂單列表
- **WHEN** 管理員呼叫 `GET /api/admin/orders`
- **THEN** 回傳所有訂單完整資料

### Requirement: 後台可查詢單筆訂單詳情
系統 SHALL 提供 `GET /api/admin/orders/[id]`，回傳單筆訂單完整資料。

#### Scenario: 查詢存在的訂單
- **WHEN** 管理員呼叫 `GET /api/admin/orders/[id]`
- **THEN** 回傳訂單完整資料

### Requirement: 後台可更新訂單狀態與付款狀態（白名單驗證）
系統 SHALL 僅接受白名單內的狀態值，拒絕其他值。

有效訂單狀態：`new`、`preparing`、`shipped`、`delivered`、`completed`、`cancelled`
有效付款狀態：`pending`、`paid`、`failed`

#### Scenario: 更新為有效狀態
- **WHEN** `PATCH /api/admin/orders/[id]` 傳入白名單內的狀態
- **THEN** 訂單狀態更新成功

#### Scenario: 傳入無效狀態
- **WHEN** `orderStatus` 或 `paymentStatus` 不在白名單內
- **THEN** 系統回傳 HTTP 400

### Requirement: 訂單完成時自動發放點數（防重複）
系統 SHALL 在 `order_status` 首次變為 `completed` 時，為訂單用戶發放回饋點數。

點數 = `max(floor(商品小計 - couponDiscount - pointsDiscount), 0)`

發放前先確認該訂單無 `type: "earn"` 記錄，防止重複發放。

#### Scenario: 首次標記完成，發放點數
- **WHEN** 前一狀態非 `completed`，新狀態為 `completed`，且訂單有 `user_id`
- **THEN** 查詢確認無 `earn` 記錄後，插入點數發放記錄（`expires_at` = 1年後）

#### Scenario: 重複標記完成，不重複發放
- **WHEN** 訂單已有 `type: "earn"` 記錄
- **THEN** 不插入新記錄

### Requirement: 後台取消訂單時還原庫存、折價券、點數
系統 SHALL 在 `order_status` 首次變為 `cancelled` 時，自動執行還原。

#### Scenario: 後台取消訂單
- **WHEN** 前一狀態非 `cancelled`，新狀態為 `cancelled`
- **THEN** 還原折價券（`used_at = null`）、還原已扣點數（插入正值記錄）、依付款方式還原庫存（COD 或已付款 ECPay 才還原）

### Requirement: 後台可手動觸發出貨通知 Email
系統 SHALL 在 `sendShippingEmail: true` 時，寄送出貨通知給客戶，失敗不影響狀態更新。

#### Scenario: 觸發出貨通知
- **WHEN** `PATCH /api/admin/orders/[id]` 帶有 `sendShippingEmail: true` 及必要欄位
- **THEN** 寄送出貨通知 Email，即使寄送失敗也回傳 `{ ok: true }`
