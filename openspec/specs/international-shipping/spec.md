# international-shipping Specification

## Purpose
國際配送：運費區域資料表、依區域與包裹總重的費用計算、結構化國際地址表單、商品配送重量欄位，以及結帳時的注意事項揭露。

## Requirements

### Requirement: 國際運費區域資料表

系統 SHALL 維護 `shipping_zones` 與 `shipping_countries` 兩張資料表，記錄 ePacket 7 個運費區域、各區域起重費與續重費、以及國家對照。

#### Scenario: 查詢可配送國家
- **WHEN** 前端呼叫 `GET /api/shipping/countries`
- **THEN** 回傳所有 `is_active = true` 的國家，包含 country_code、country_name、country_name_en、zone_code、shipping_fee（起重）、estimated_days_min/max

#### Scenario: 國家不在支援清單
- **WHEN** 結帳時提交的 country_code 不在 shipping_countries 或 is_active = false
- **THEN** 回傳錯誤「此國家暫不支援配送」

### Requirement: 國際運費計算

國際運費 SHALL 依寄達國家所屬區域與包裹總重計算，公式為：`fee = base + ceil((totalWeightG - 100) / 100) * perExtra`。

#### Scenario: 正常計算
- **WHEN** 訂單配送至日本（asia_1），商品總重 600g
- **THEN** 運費 = 100 + ceil((600-100)/100) * 20 = 100 + 5*20 = NT$200

#### Scenario: 國際免運
- **WHEN** 商品小計 >= NT$2,500 且 deliveryType = "international"
- **THEN** 運費為 NT$0

#### Scenario: 未達免運門檻
- **WHEN** 商品小計 < NT$2,500 且 deliveryType = "international"
- **THEN** 照區域費率收取運費

#### Scenario: 超過 ePacket 限重
- **WHEN** 商品總重超過 2000g
- **THEN** 顯示提示「國際配送單筆訂單限重 2kg，請減少商品數量」，不允許提交

### Requirement: 國際地址表單

國際訂單 SHALL 填寫結構化地址欄位，存入 orders.shipping_address JSONB。

#### Scenario: 填寫國際地址
- **WHEN** 選擇國際配送並選定國家
- **THEN** 顯示地址表單：Full Name、Phone（含國碼，如 +81-90-1234-5678）、Country（已選）、State/Province、City、Address Line 1、Address Line 2（選填）、Postal Code

#### Scenario: 驗證必填欄位
- **WHEN** 提交時 state、city、addressLine1、postalCode 任一為空
- **THEN** 顯示對應欄位的錯誤提示

#### Scenario: 國際電話號碼驗證
- **WHEN** 配送地區為國際配送
- **THEN** 電話驗證改用寬鬆規則 `^\+?[\d\s\-()]{7,20}$`（允許國際格式）
- **THEN** 台灣境內維持原有 `^09\d{8}$` 驗證

#### Scenario: 儲存地址格式
- **WHEN** 訂單建立成功
- **THEN** shipping_address 儲存為 `{ type: "international", country, countryName, state, city, addressLine1, addressLine2?, postalCode }`

### Requirement: 國際訂單注意事項

結帳頁選擇國際配送時，SHALL 顯示注意事項聲明。

#### Scenario: 顯示注意事項
- **WHEN** 使用者選擇國際配送
- **THEN** 在地址表單上方顯示：進口關稅由收件人負擔、配送時間為預估、退貨運費由買家負擔、部分國家可能有茶葉進口限制

### Requirement: 商品配送重量

products 表 SHALL 提供 3 個配送重量欄位（`shipping_weight_150g`、`shipping_weight_75g`、`shipping_weight_teabag`），管理員可從後台調整。留空時使用預設值。

#### Scenario: 使用商品自訂重量
- **WHEN** 商品有設定 shipping_weight_150g / shipping_weight_75g / shipping_weight_teabag
- **THEN** 使用該值計算國際運費

#### Scenario: 未設定時 fallback 預設值
- **WHEN** 商品配送重量欄位為 null
- **THEN** fallback 到 DEFAULT_SPEC_WEIGHT_G：150g = 200g、75g = 120g、teabag = 150g

#### Scenario: 後台編輯配送重量
- **WHEN** 管理員在後台商品編輯頁修改配送重量
- **THEN** 儲存到 products 表對應欄位
- **THEN** placeholder 顯示預設值（如「預設 200g」），留空即使用預設

#### Scenario: 前端即時顯示總重
- **WHEN** 選擇國際配送且購物車有商品
- **THEN** 前端從 CartItem.product 取得配送重量（自訂值或 fallback），即時計算並顯示總重
