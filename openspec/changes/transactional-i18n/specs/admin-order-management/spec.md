## MODIFIED Requirements

### Requirement: 後台可手動觸發出貨通知 Email
系統 SHALL 在 `sendShippingEmail: true` 時，寄送出貨通知給客戶，失敗不影響狀態更新。

信件語言 SHALL 取自**訂單持久化的語系**，而非後台操作者的介面語系——出貨信是寄給客戶的，客戶的語言在下單時就決定了。

#### Scenario: 觸發出貨通知
- **WHEN** `PATCH /api/admin/orders/[id]` 帶有 `sendShippingEmail: true` 及必要欄位
- **THEN** 寄送出貨通知 Email，即使寄送失敗也回傳 `{ ok: true }`

#### Scenario: 對英文訂單觸發出貨通知
- **WHEN** 後台（介面為中文）對語系為 `en` 的訂單觸發出貨通知
- **THEN** 客戶收到英文出貨信——後台介面語言不影響寄出的信件語言
