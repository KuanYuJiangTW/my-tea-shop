# order-result Specification

## Purpose
國際訂單的結果頁顯示。國際訂單的運費、地址與注意事項與國內不同，結果頁要如實反映。

## Requirements

### Requirement: 國際訂單結果頁

訂單結果頁 SHALL 顯示國際配送相關資訊。

#### Scenario: PayPal 國際訂單付款成功
- **WHEN** 國際訂單 PayPal 付款成功
- **THEN** 顯示預估配送天數（如「預計 7-10 個工作天送達」）
- **THEN** 顯示提醒「進口關稅由收件人負擔」
