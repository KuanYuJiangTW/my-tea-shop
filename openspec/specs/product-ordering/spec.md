## MODIFIED Requirements

### Requirement: DeliveryType 擴展

DeliveryType 新增 "international" 選項。

#### Scenario: 國際訂單建立
- **WHEN** deliveryType = "international"，包含有效 countryCode 與國際地址
- **THEN** 使用共用運費函式計算國際運費，建立訂單
- **THEN** 將收件地址帶入 PayPal Order 的 shipping 欄位（Seller Protection）

#### Scenario: 國際訂單 API request 結構
- **WHEN** deliveryType = "international"
- **THEN** request body 需包含：
  - `internationalAddress: { country, countryName, state, city, addressLine1, addressLine2?, postalCode }`
  - `items[].spec`（用於計算配送重量）
- **THEN** 後端驗證 country 為有效的 shipping_countries，各必填欄位不為空

#### Scenario: 國際訂單運費計算
- **WHEN** 建立國際訂單
- **THEN** 運費從 shipping_zones/shipping_countries 查表計算，不使用硬編碼值

### Requirement: 運費計算改用共用函式

所有建單 API（/api/orders、/api/ecpay/checkout、/api/stripe/checkout、/api/paypal/create-order）的運費計算統一改用 `calculateShippingFee()`。

#### Scenario: 國內訂單不受影響
- **WHEN** deliveryType = "home" 或 "cvs"
- **THEN** 運費結果與 `calcDomesticFee` 完全一致（滿 1000 免運，宅配 150，超商 60）
  ——費率以 `shipping-constants.ts` 的 `DOMESTIC_FEES` 為單一真相，本文不再另記數字
