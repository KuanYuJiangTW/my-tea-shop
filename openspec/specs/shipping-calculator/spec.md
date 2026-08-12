## ADDED Requirements

### Requirement: 共用運費計算函式

`src/lib/shipping.ts` 提供統一的運費計算入口，取代現有 5 個 API route 中的重複邏輯。

#### Scenario: 國內宅配
- **WHEN** deliveryType = "home"，subtotal >= 1000
- **THEN** fee = 0

#### Scenario: 國內宅配未達免運
- **WHEN** deliveryType = "home"，subtotal < 1000
- **THEN** fee = 150（黑貓「3 斤以下・本島」實收 130 ＋ 包材緩衝；2026-08-12 由 250 修正，
  原值是黑貓「15–30 斤」費率，與實際出貨量體不符）
- **THEN** 離島不另計（已知缺口：黑貓離島 3 斤以下為 220）

#### Scenario: 超商取貨
- **WHEN** deliveryType = "cvs"，subtotal >= 1000
- **THEN** fee = 0

#### Scenario: 超商取貨未達免運
- **WHEN** deliveryType = "cvs"，subtotal < 1000
- **THEN** fee = 60

#### Scenario: 國際配送（使用預設重量）
- **WHEN** deliveryType = "international"，countryCode = "JP"，items = [{ spec: "150g", quantity: 2 }, { spec: "75g", quantity: 1 }]，商品無自訂重量
- **THEN** fallback 預設值，總重 = 200*2 + 120*1 = 520g
- **THEN** 查詢 shipping_zones/shipping_countries，計算 fee = 100 + ceil((520-100)/100)*20 = 100+5*20 = NT$200
- **THEN** 回傳 { fee, zoneName, estimatedDays, totalWeightG }

#### Scenario: 國際配送（使用商品自訂重量）
- **WHEN** deliveryType = "international"，商品 A 的 shipping_weight_150g = 220（自訂），商品 B 無自訂值
- **THEN** 商品 A 用 220g，商品 B fallback 預設值
- **THEN** 正確加總計算運費

#### Scenario: 國際免運
- **WHEN** deliveryType = "international"，subtotal >= 2500
- **THEN** fee = 0（仍回傳 totalWeightG 供超重檢查）

#### Scenario: 超過 2kg 限重
- **WHEN** deliveryType = "international"，items 總重超過 2000g
- **THEN** throw Error("Exceeds 2kg weight limit")

#### Scenario: 不支援的國家
- **WHEN** deliveryType = "international"，countryCode 不在支援清單
- **THEN** throw Error("Unsupported country")

#### Scenario: 前端重量計算 helper
- **WHEN** 前端需要即時顯示總重
- **THEN** 匯出 `calcTotalWeightG(items)` 與 `DEFAULT_SPEC_WEIGHT_G` 常量供前端使用
- **THEN** `getItemWeightG(spec, product)` 優先取商品自訂值，fallback 到預設
