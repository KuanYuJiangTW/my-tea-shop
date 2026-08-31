# ecpay-checkout Specification

## Purpose
綠界金流結帳：來源驗證、訂單編號前綴規則、callback 簽章驗證、庫存扣減失敗的標記，以及結果頁轉址。

## Requirements

### Requirement: ECPay 結帳只接受來自本站的請求
系統 SHALL 驗證 `Origin` header，拒絕非本站來源的請求。

#### Scenario: 跨站請求被拒
- **WHEN** `Origin` header 不符合 `NEXT_PUBLIC_BASE_URL`
- **THEN** 系統回傳 HTTP 403

### Requirement: ECPay 建立訂單後回傳表單參數供前端送出
系統 SHALL 產生含 `CheckMacValue` 的 ECPay 表單參數，由前端以 POST 送至 ECPay。

#### Scenario: ECPay 結帳成功建立
- **WHEN** 所有驗證通過（與 COD 相同驗證邏輯）
- **THEN** 系統建立 `payment_status: "pending"` 訂單，回傳 `{ ecpayUrl, params }`，其中 `params` 含 `CheckMacValue`

### Requirement: ECPay MerchantTradeNo 以前綴區分訂單類型
系統 SHALL 使用 `T{timestamp}` 作為商品訂單的 MerchantTradeNo，`B{timestamp}` 作為體驗預約。

#### Scenario: 商品訂單 TradeNo 格式
- **WHEN** 建立 ECPay 商品訂單
- **THEN** `MerchantTradeNo` 為 `T` 開頭，最長 20 字元

### Requirement: ECPay return callback 驗證簽章後更新付款狀態
系統 SHALL 驗證 ECPay 的 `CheckMacValue`，通過後才更新訂單付款狀態。

#### Scenario: 付款成功 callback（商品訂單）
- **WHEN** `POST /api/ecpay/return` 收到 `RtnCode = "1"`，`MerchantTradeNo` 為 `T` 開頭
- **THEN** 更新 `payment_status = "paid"`，扣減庫存，寄出訂單確認信

#### Scenario: 簽章驗證失敗
- **WHEN** `CheckMacValue` 不符
- **THEN** 系統回傳 `0|CheckMacValue Error`，不更新任何資料

### Requirement: ECPay 付款成功後庫存扣減失敗時標記 stock_issue
系統 SHALL 在付款成功但庫存扣減失敗時，將訂單狀態更新為 `stock_issue` 供人工處理。

#### Scenario: 極端競態導致庫存不足
- **WHEN** 付款成功後 `decrement_stock` RPC 回傳 false
- **THEN** 訂單 `order_status` 更新為 `stock_issue`，記錄 error log

### Requirement: ECPay result 端點轉址至前台結果頁
系統 SHALL 將 ECPay POST 回的表單資料，以 302 轉址至 `/order/result?...`。

#### Scenario: 付款完成轉址
- **WHEN** `POST /api/ecpay/result` 收到 ECPay 表單資料
- **THEN** 302 轉址至 `${BASE_URL}/order/result?{params}`

### Requirement: Idempotent payment notification processing

ECPay server 端付款通知（`/api/ecpay/return`）SHALL 以冪等方式處理：對同一筆交易的重複或重放的合法通知，付款後處理（扣庫存、確認預約、寄送通知信）SHALL 至多執行一次（exactly-once）。

#### Scenario: 重放一般商品訂單通知

- **WHEN** 收到簽章合法、`RtnCode=1` 的訂單付款通知，但該訂單的 `payment_status` 已非 `pending`
- **THEN** 系統 SHALL 不再扣減庫存、不再寄送訂單確認信，並仍回應 `1|OK`

#### Scenario: 重放體驗預約通知

- **WHEN** 收到簽章合法、`RtnCode=1` 的體驗預約付款通知，但該預約的 `status` 已非 `pending_payment`
- **THEN** 系統 SHALL 不再重複確認預約、不再寄送預約確認信，並仍回應 `1|OK`

#### Scenario: 首次合法通知

- **WHEN** 收到簽章合法、`RtnCode=1` 的通知，且訂單/預約仍為待付款狀態
- **THEN** 系統 SHALL 將其標記為已付款/已確認，並執行扣庫存與寄信各一次
