## ADDED Requirements

### Requirement: PayPal 結帳的收件地址處理

建立 PayPal Order 時，系統 SHALL 明確指定 `experience_context.shipping_preference`，
SHALL NOT 依賴 PayPal 的預設值 `GET_FROM_FILE`。

預設值會讓 PayPal 忽略我們傳入的 `purchase_units[].shipping`，改由客人在 PayPal
端自行挑選地址。後果是多一個結帳步驟，且客人在 PayPal 選的地址與我們實際出貨
依據的 `orders.shipping_address` 可能不一致。

#### Scenario: 國際訂單帶入我方地址
- **WHEN** 建立國際訂單的 PayPal Order（有傳入收件地址）
- **THEN** `shipping_preference` 為 `SET_PROVIDED_ADDRESS`
- **THEN** PayPal 顯示我方傳入的地址，客人無法在 PayPal 端更改

#### Scenario: 國內訂單不在 PayPal 收地址
- **WHEN** 建立國內訂單的 PayPal Order（未傳入收件地址）
- **THEN** `shipping_preference` 為 `NO_SHIPPING`
- **THEN** PayPal 不顯示地址欄位（地址已於本站結帳頁收取）
