## Why

茶藝店商品購物（含 ECPay 金流）已上線運作，但缺乏規格文件。本文件為逆向文件化成果，記錄現有的商品訂購、兩種付款流程（貨到付款 / 線上刷卡）、超商取貨、折價券、點數折抵等功能的完整規格，作為後續開發的基準線。

## What Changes

這是一份現況基準線文件，描述已實作的功能，非新功能規劃。

- 商品下單：後端驗證價格與庫存（不信任前端金額），支援 150g / 75g / 茶包三種規格
- 運費計算：訂單滿 NT$1,000 免運；宅配 NT$250；超商取貨 NT$60
- 付款方式：貨到付款（COD）與線上刷卡（ECPay AIO）
- 超商地圖選取：ECPay 物流 API，彈窗 postMessage 回傳門市資訊
- 折價券：用戶專屬、單次使用、有效期限、最低消費門檻
- 點數折抵：最少 200 點、100 的倍數、最高折抵訂單金額 10%
- 訂單取消：僅 `new` 狀態可取消；取消時還原庫存、折價券、點數
- 修改收件地址：`new` / `preparing` 狀態的宅配訂單可修改

## Capabilities

### New Capabilities

- `product-ordering`: 商品下單流程（後端驗價、庫存驗證、運費計算、COD 建立訂單）
- `ecpay-checkout`: ECPay 線上刷卡付款（建立 ECPay 表單、驗章、付款 callback）
- `cvs-pickup`: 超商取貨地圖選取（ECPay 物流 API、postMessage 門市回傳）
- `coupon-and-points`: 折價券與點數折抵（驗證、使用、還原）
- `order-management`: 訂單自助管理（取消、修改地址）

### Modified Capabilities

（本文件為首次建立，無既有規格需更新）

## Impact

**資料表**：orders、products（含庫存欄位）、coupons、point_transactions

**API 端點**：
- `POST /api/orders`（COD 建立訂單）
- `GET /api/orders`（我的訂單列表）
- `POST /api/orders/[id]/cancel`（取消訂單）
- `PATCH /api/orders/[id]/address`（修改收件地址）
- `POST /api/ecpay/checkout`（ECPay 建立付款）
- `POST /api/ecpay/return`（付款完成前端轉址）
- `POST /api/ecpay/result`（ECPay server-side 付款通知）
- `POST /api/ecpay/cvs-map`（取得超商地圖網址）
- `POST /api/ecpay/cvs-callback`（超商門市選取回傳）
- `GET /api/products/stock`（查詢所有商品庫存）
- `GET /api/user/coupons`（我的折價券）
- `GET /api/user/points`（我的點數）

**外部依賴**：ECPay（AIO 金流 + 物流地圖）、Resend（訂單確認 Email）、Supabase RPC（decrement_stock / increment_stock）

---

> **備注**：本文件為既有專案的逆向文件化成果，非事前規格書。
> 建立日期：2026-04-08
