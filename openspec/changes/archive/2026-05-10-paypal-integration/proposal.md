## Why

Stripe 不支援台灣作為業務所在地，無法用台灣身份註冊正式帳號收款。茶藝店原有 COD（貨到付款）與 ECPay（線上刷卡）兩種付款方式，僅支援台灣境內消費者。為拓展海外客群（英文版網站），以 PayPal 取代 Stripe Coming Soon 按鈕，讓國際買家可直接使用 PayPal 帳號或信用卡付款。

> **目標客群**：PayPal 主要服務「在台灣但沒有台灣銀行卡的外籍人士」及「偏好 PayPal 的消費者」。國際配送（含國際運費計算）列為 Phase 2 規劃。

## What Changes

- 將現有 Stripe Coming Soon 按鈕替換為 PayPal 付款按鈕（Stripe 後端程式碼保留不刪）
- 新增 PayPal 付款流程：建立 PayPal Order → 跳轉 PayPal 付款頁 → Capture 扣款 → 更新訂單狀態
- 新增 Webhook 接收 PayPal 事件通知，確保付款狀態同步
- 新增重試機制：用戶取消付款後可重新跳轉 PayPal
- 競態處理：Result 頁面與 Webhook 可能同時 capture，以 ORDER_ALREADY_CAPTURED 視為成功
- Rate Limit：PayPal API 端點限制 20 req/60s
- 多語系：英文版隱藏貨到付款、PayPal 相關翻譯鍵
- 管理後台：訂單列表與詳情顯示 PayPal 付款資訊
- 會員中心：PayPal 待付款訂單提供「重新付款」按鈕
- 訂單取消：PayPal pending 訂單取消不還原庫存（未扣過），paid 訂單取消才還原
- 點數/優惠券回滾：PayPal 建單失敗時自動退還已扣點數與優惠券
- 取消訂單庫存多還 Bug 修復：PayPal pending 訂單未扣庫存不應還原

## Capabilities

### New Capabilities

- `paypal-checkout`: PayPal 付款流程（建單、capture、webhook、重試、競態處理）

### Modified Capabilities

- `product-ordering`: 新增 PayPal 付款方式，建單 API 需處理 PayPal 回滾邏輯
- `order-management`: 取消訂單時依 PayPal 付款狀態決定是否還原庫存
- `checkout-flow`: 結帳流程新增 PayPal 付款選項，取代 Stripe Coming Soon 按鈕
- `order-result`: 訂單結果頁支援 PayPal 付款狀態查詢與顯示

## Impact

**資料表**：orders（新增 `paypal_order_id` 欄位；`payment_method` 欄位新增 "paypal" 值）

**API 端點**：
- `POST /api/paypal/create-order`（建立 PayPal 訂單，含驗價、庫存檢查、優惠券/點數處理）
- `POST /api/paypal/capture`（前端 capture 扣款）
- `POST /api/paypal/webhook`（PayPal 事件通知）
- `POST /api/paypal/retry`（重新產生 PayPal 付款連結）

**新增檔案**：
- `src/lib/paypal.ts`（PayPal SDK 封裝：token 快取、建單、capture、webhook 驗簽、共用 capture 處理）
- `src/lib/rate-limit.ts`（Rate Limiter）
- `supabase/add_paypal_order_id.sql`（DB migration）

**前端修改**：
- `src/app/checkout/CheckoutClient.tsx` — Stripe 按鈕替換為 PayPal（含 logo 品牌配色 #003087/#009cde）
- `src/app/order/result/ResultClient.tsx` — PayPal capture/取消/失敗 UI
- `src/app/account/AccountClient.tsx` — 訂單列表重試付款按鈕

**外部依賴**：PayPal REST API v2（直接 fetch，不用 SDK；Sandbox / Live 切換靠 `PAYPAL_MODE` 環境變數）

**環境變數**：
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE`（sandbox / live）

---

> **備注**：本文件整合自 `hide-stripe-add-paypal`、`paypal-payment-integration` 兩份 change。
> 建立日期：2026-05-10
