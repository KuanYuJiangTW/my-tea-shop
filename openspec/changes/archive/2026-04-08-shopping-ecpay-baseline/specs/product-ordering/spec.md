## ADDED Requirements

### Requirement: 必須登入才能下單
系統 SHALL 拒絕未登入使用者的下單請求，回傳 401。

#### Scenario: 未登入用戶嘗試下單
- **WHEN** 未登入使用者呼叫 `POST /api/orders`
- **THEN** 系統回傳 HTTP 401 `{ error: "請先登入" }`

### Requirement: 後端重新計算所有金額，不信任前端傳入的價格
系統 SHALL 以資料庫中的商品價格計算金額，忽略前端傳入的任何金額欄位。

#### Scenario: 商品單價以資料庫為準
- **WHEN** 下單請求包含 `items` 陣列（含 `productId`、`quantity`、`spec`）
- **THEN** 系統從資料庫查詢每個 `productId` 的真實價格，前端無法影響計算結果

### Requirement: 商品支援三種規格
系統 SHALL 支援 `150g`（預設）、`75g`、`teabag` 三種規格，並各自有獨立庫存與價格。

#### Scenario: 指定不支援的規格
- **WHEN** `spec` 非 `150g` / `75g` / `teabag`
- **THEN** 系統回傳 HTTP 400

#### Scenario: 商品無此規格
- **WHEN** 商品的 `price_75g` 為 null，但請求 `spec = "75g"`
- **THEN** 系統回傳 HTTP 400 `{ error: "商品無 75g 規格：<商品名>" }`

### Requirement: 後端驗證庫存充足
系統 SHALL 在建立訂單前驗證每個品項的庫存，並以原子性 RPC 扣減（COD）。

#### Scenario: 庫存不足
- **WHEN** 某品項的可用庫存 < 請求數量
- **THEN** 系統回傳 HTTP 400 `{ error: "庫存不足：<商品名>" }`

### Requirement: 運費依訂單小計與配送方式計算
系統 SHALL 依以下規則計算運費：
- 訂單小計 ≥ NT$1,000：免運費
- 宅配（home）：NT$250
- 超商取貨（cvs）：NT$60

#### Scenario: 訂單滿千免運
- **WHEN** 所有品項小計加總 ≥ NT$1,000
- **THEN** `shipping_fee = 0`

#### Scenario: 宅配未滿千
- **WHEN** 小計 < NT$1,000 且 `deliveryType = "home"`
- **THEN** `shipping_fee = 250`

### Requirement: 支援四大超商取貨
系統 SHALL 支援 `seven`（7-11）、`family`（全家）、`hilife`（萊爾富）、`ok`（OK 超商）。

#### Scenario: 傳入不支援的超商類型
- **WHEN** `cvsInfo.company` 不在支援清單內
- **THEN** 系統回傳 HTTP 400

### Requirement: COD 訂單於建立時即扣減庫存
系統 SHALL 在 `POST /api/orders`（COD 流程）成功建立訂單前，原子性扣減庫存。

#### Scenario: COD 下單成功
- **WHEN** 所有驗證通過，`payment_method = "cod"`
- **THEN** 庫存扣減，訂單建立（`order_status: "new"`, `payment_status: "pending"`），寄出訂單確認信

### Requirement: 訂單建立後寄送確認 Email
系統 SHALL 在訂單建立成功後，寄送確認信至使用者的帳號 Email。

#### Scenario: 訂單建立成功寄信
- **WHEN** 訂單成功建立
- **THEN** 寄送含訂單編號、品項、金額、配送地址的確認信給 `user.email`
