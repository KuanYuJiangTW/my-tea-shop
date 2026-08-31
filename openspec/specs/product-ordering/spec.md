# product-ordering Specification

## Purpose
建單流程的 DeliveryType 擴展（新增 international），以及所有建單 API 統一改用共用運費函式、不各自實作。
## Requirements
### Requirement: DeliveryType 擴展

系統 SHALL 在 DeliveryType 提供 "international" 選項。

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

所有建單 API（/api/orders、/api/ecpay/checkout、/api/stripe/checkout、/api/paypal/create-order）的運費計算統一改用 `calculateShippingFee()`。組合品項 SHALL 以其組合定價計入運費判斷的小計。

#### Scenario: 國內訂單不受影響
- **WHEN** deliveryType = "home" 或 "cvs"
- **THEN** 運費結果與 `calcDomesticFee` 完全一致（滿 1000 免運，宅配 150，超商 60）
  ——費率以 `shipping-constants.ts` 的 `DOMESTIC_FEES` 為單一真相，本文不再另記數字

#### Scenario: 訂單含組合
- **WHEN** 訂單含組合品項
- **THEN** 小計採用組合定價，免運門檻的判斷與單品訂單一致

### Requirement: 建單時組合品項改扣其成分庫存
所有建單 API（`/api/orders`、`/api/ecpay/checkout`、`/api/stripe/checkout`、`/api/paypal/create-order`）SHALL 在品項為組合時，改呼叫 `decrement_bundle_stock` 扣減其成分，而非對組合本身扣減。

#### Scenario: 訂單只含組合
- **WHEN** 訂單含一組品飲組
- **THEN** 三款成分的 `stock_75g` 各減 1，無任何 `products` 列被當成組合本身扣減

#### Scenario: 訂單混合單品與組合
- **WHEN** 訂單含一包 150g 散茶與一組品飲組
- **THEN** 散茶走既有的 `decrement_stock`、組合走 `decrement_bundle_stock`，兩者都成功才建立訂單

#### Scenario: 組合的成分與單品指向同一款茶
- **WHEN** 訂單同時含「金萱 75g 單買 ×1」與「品飲組 ×1」（組合內含金萱 75g ×1）
- **THEN** 金萱的 `stock_75g` 合計減 2

### Requirement: 組合品項的單價與小計以組合定價為準
系統 SHALL 以 `product_bundles.price` 作為組合的單價，SHALL NOT 由成分售價加總推導。

#### Scenario: 組合定價低於成分加總
- **WHEN** 組合定價 650、成分單買合計 700
- **THEN** 訂單小計以 650 計算，運費與折抵一律基於此金額

### Requirement: 取消訂單時組合品項回補其成分庫存
系統 SHALL 在取消含組合的訂單時，依訂單保存的成分快照回補各成分庫存。

#### Scenario: 取消含組合的訂單
- **WHEN** 管理員或客人取消一筆含品飲組的訂單
- **THEN** 三款成分的庫存各回補 1

#### Scenario: 成分在期間內被調整過
- **WHEN** 訂單成立後組合的成分被改動，之後該訂單被取消
- **THEN** 回補的是**訂單快照裡的成分**，不是目前的成分設定

