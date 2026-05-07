## Why

Stripe 不支援台灣作為業務所在地，無法用台灣身份註冊正式帳號收款。網站需要一個台灣商家可直接使用的國際金流方案，讓國外客人能方便付款。PayPal 支援台灣商家註冊，且國際消費者信任度高，是最務實的替代方案。

## What Changes

- 將現有 Stripe Coming Soon 按鈕替換為 PayPal 付款按鈕
- 新增 PayPal Checkout 整合，服務在台外籍人士及偏好 PayPal 的消費者（Phase 1 僅國內配送，Phase 2 再開放國際配送）
- 結帳頁面付款方式：綠界（國內）/ PayPal（國外）/ 貨到付款
- 新增 PayPal webhook 處理付款完成通知
- 訂單結果頁面支援 PayPal 付款狀態顯示
- 會員中心訂單紀錄：PayPal 待付款訂單提供「重新付款」按鈕（PayPal 頁面意外關閉時可從訂單紀錄重新付款）
- Stripe 程式碼保留不刪除，僅移除前端 Coming Soon 按鈕

## Capabilities

### New Capabilities
- `paypal-checkout`: PayPal 結帳整合 — 建立 PayPal order、處理付款回調、webhook 驗證與訂單狀態更新

### Modified Capabilities
- `checkout-flow`: 結帳流程新增 PayPal 付款選項，取代 Stripe Coming Soon 按鈕
- `order-result`: 訂單結果頁支援 PayPal 付款狀態查詢與顯示

## Impact

- 前端: `src/app/checkout/CheckoutClient.tsx` — Stripe Coming Soon 按鈕替換為 PayPal
- 前端: `src/app/account/AccountClient.tsx` — 會員訂單紀錄新增 PayPal 重新付款按鈕、付款方式顯示 PayPal
- 前端: 英文版結帳頁隱藏貨到付款選項（國際配送不適用）
- API: 新增 `src/app/api/paypal/` 路由（create-order、capture、webhook）
- 環境變數: 新增 `PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`、`PAYPAL_WEBHOOK_ID`、`PAYPAL_MODE`
- 依賴: 直接使用 PayPal REST API v2（不加額外套件）
- 資料庫: orders 表新增 `paypal_order_id` 欄位記錄 PayPal Order ID；`payment_method` 欄位新增 "paypal" 值
- 管理後台: 訂單列表需支援顯示 PayPal 訂單
