## ADDED Requirements

### Requirement: 重新付款保留原訂單的國際脈絡

`POST /api/paypal/retry` 重新建立 PayPal Order 時，SHALL 依原訂單的
`shipping_address.type` 還原國際脈絡，SHALL NOT 產生與首次結帳不同的付款體驗。

缺少這項時，走重新付款的國際客人會失去既有規格「PayPal 國際訂單付款成功 →
顯示預估配送天數、顯示進口關稅由收件人負擔」所要求的揭露。

#### Scenario: 國際訂單重新付款
- **WHEN** 對 `shipping_address.type = "international"` 的訂單呼叫重新付款
- **THEN** 依原訂單地址傳入 PayPal 的 `purchase_units[].shipping`
- **THEN** `returnUrl` 帶 `intl=1`，使成功頁顯示國際訂單須知

#### Scenario: 國內訂單重新付款
- **WHEN** 對國內訂單呼叫重新付款
- **THEN** 不傳入地址，`returnUrl` 不帶 `intl=1`
