# PayPal 付款整合 — 任務清單

## Task 1: PayPal 核心函式庫
- **檔案**: `src/lib/paypal.ts`
- **內容**: getPayPalAccessToken, paypalFetch, createPayPalOrder, capturePayPalOrder, verifyPayPalWebhook, processPayPalCapture
- **狀態**: [x] 已完成

## Task 2: 建立訂單 API
- **檔案**: `src/app/api/paypal/create-order/route.ts`
- **內容**: 驗證輸入/庫存/優惠券/積分 → 建立 DB 訂單 → 建立 PayPal 訂單 → 失敗 rollback
- **狀態**: [x] 已完成

## Task 3: Capture API
- **檔案**: `src/app/api/paypal/capture/route.ts`
- **內容**: 登入驗證 + ownership → 冪等 capture → processPayPalCapture
- **狀態**: [x] 已完成

## Task 4: Webhook API
- **檔案**: `src/app/api/paypal/webhook/route.ts`
- **內容**: 簽章驗證 → 處理 CHECKOUT.ORDER.APPROVED / PAYMENT.CAPTURE.COMPLETED
- **狀態**: [x] 已完成

## Task 5: 重試付款 API
- **檔案**: `src/app/api/paypal/retry/route.ts`
- **內容**: 驗證訂單可重試 → 建立新 PayPal 訂單 → 更新 paypal_order_id
- **狀態**: [x] 已完成

## Task 6: 前端結帳頁整合
- **檔案**: `src/app/checkout/CheckoutClient.tsx`
- **內容**: PayPal 付款選項（最低 NT$32 限制）、提交按鈕、跳轉邏輯
- **狀態**: [x] 已完成

## Task 7: 前端付款結果頁
- **檔案**: `src/app/order/result/ResultClient.tsx`
- **內容**: PayPal capture loading、成功頁、取消頁（重試/取消按鈕）、失敗頁
- **狀態**: [x] 已完成

## Task 8: 會員帳戶頁重試
- **檔案**: `src/app/account/AccountClient.tsx`
- **內容**: 訂單列表中 pending PayPal 訂單顯示重試按鈕
- **狀態**: [x] 已完成

## Task 9: 自動化測試
- **檔案**: `src/__tests__/paypal/` (5 個測試檔 + helpers)
- **內容**: 63 個測試覆蓋 lib、create-order、capture、webhook、retry
- **狀態**: [x] 已完成

## Task 10: 修復取消訂單庫存多還 Bug
- **檔案**: `src/app/api/orders/[id]/cancel/route.ts`
- **內容**: shouldRestoreStock 邏輯修正 — PayPal pending 訂單未扣庫存不應還原
- **狀態**: [x] 已完成
