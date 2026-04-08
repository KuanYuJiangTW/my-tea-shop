## 1. 資料庫 Schema

- [x] 1.1 建立 `orders` 資料表（含 `order_status`、`payment_status`、`items` JSONB、`shipping_address` JSONB）
- [x] 1.2 建立 `products` 資料表（含 `price`、`price_75g`、`price_tea_bag`、三種庫存欄位）
- [x] 1.3 建立 `coupons` 資料表（`user_id`、`code`、`discount_amount`、`min_order_amount`、`expires_at`、`used_at`）
- [x] 1.4 建立 `point_transactions` 資料表（`user_id`、`points`、`type`、`order_id`、`description`）
- [x] 1.5 建立 `decrement_stock` RPC（原子性扣減三種規格庫存，庫存不足回傳 false）
- [x] 1.6 建立 `increment_stock` RPC（原子性還原庫存）

## 2. COD 商品下單

- [x] 2.1 實作 `POST /api/orders`（後端驗價、庫存驗證、運費計算）
- [x] 2.2 支援三種規格（150g / 75g / teabag）的價格與庫存查詢
- [x] 2.3 折價券驗證與使用（`used_at` 鎖定）
- [x] 2.4 點數折抵驗證（餘額、格式、10% 上限）與即時扣除
- [x] 2.5 原子性扣減庫存（`decrement_stock` RPC）
- [x] 2.6 建立訂單記錄（`order_status: "new"`, `payment_status: "pending"`）
- [x] 2.7 下單成功後寄送確認 Email

## 3. ECPay 線上刷卡

- [x] 3.1 實作 `POST /api/ecpay/checkout`（Origin 驗證、相同驗價邏輯、建立 pending 訂單）
- [x] 3.2 產生 `MerchantTradeNo`（`T{timestamp}` 格式）
- [x] 3.3 實作 `CheckMacValue` 計算（SHA256 + phpUrlencode）
- [x] 3.4 回傳 `{ ecpayUrl, params }` 供前端送出表單
- [x] 3.5 實作 `POST /api/ecpay/return`（付款完成轉址至 `/order/result`）
- [x] 3.6 實作 `POST /api/ecpay/result`（server-side callback，驗章後依 TradeNo 前綴路由）
- [x] 3.7 付款成功：更新 `payment_status = "paid"`，扣減庫存，寄出確認信
- [x] 3.8 庫存扣減失敗時標記 `order_status = "stock_issue"`

## 4. 超商取貨地圖

- [x] 4.1 實作 `POST /api/ecpay/cvs-map`（使用物流專用 HASH_KEY/IV 產生簽章）
- [x] 4.2 支援四大超商 SubType 對應（seven / family / hilife / ok）
- [x] 4.3 實作 `POST /api/ecpay/cvs-callback`（回傳 postMessage HTML，傳回門市資訊並關閉彈窗）

## 5. 折價券與點數 API

- [x] 5.1 實作 `GET /api/user/coupons`（未使用且有效，依到期日升序）
- [x] 5.2 實作 `GET /api/user/points`（計算餘額 + 最近 20 筆記錄）

## 6. 訂單自助管理

- [x] 6.1 實作 `GET /api/orders`（我的訂單列表）
- [x] 6.2 實作 `POST /api/orders/[id]/cancel`（僅 `new` 狀態可取消）
- [x] 6.3 取消時依付款方式還原庫存（COD 還原、ECPay 未付款不還原）
- [x] 6.4 取消時還原折價券（`used_at = null`）與點數（插入還原記錄）
- [x] 6.5 實作 `PATCH /api/orders/[id]/address`（僅 `new` / `preparing` 且宅配訂單可修改）

## 7. 商品庫存查詢

- [x] 7.1 實作 `GET /api/products/stock`（回傳所有上架商品三種規格庫存）
