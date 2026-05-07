## 1. 環境變數與資料庫

- [x] 1.1 在 `.env.example` 新增 PayPal 相關環境變數（PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_MODE）
- [x] 1.2 orders 表新增 `paypal_order_id` 欄位（nullable text），用於記錄 PayPal Order ID
- [x] 1.3 建立 `src/lib/paypal.ts` — PayPal access token 取得與快取、base URL 判斷（sandbox/live）、抽出 `processPayPalCapture(orderId)` 共用函式（冪等檢查、DB 更新 payment_status 為 paid、扣庫存、寄信），供 capture 端點和 webhook handler 共用

## 2. PayPal API 路由

- [x] 2.1 建立 `src/app/api/paypal/create-order/route.ts` — 驗證登入、驗證點數規則（最低 200 點、100 倍數、不超過訂單 10%、餘額足夠）、驗證折價券、驗證最低金額 NT$32、**create-order 時即扣除點數與折價券**、建立 DB 訂單、呼叫 PayPal Create Order API、存入 paypal_order_id、回傳 `{ url, orderId }`。**若 PayPal API 失敗須回滾：將 DB 訂單標記為 failed、退還點數（insert earn）、回滾折價券（used_at = null）**
- [x] 2.2 建立 `src/app/api/paypal/capture/route.ts` — 驗證登入、驗證訂單歸屬（防越權）、呼叫 PayPal Capture API、透過共用函式 `processPayPalCapture()` 處理 DB 更新（payment_status: paid、order_status 維持 new）、扣庫存、寄信。加上 rate limiting（20 req/min per IP）
- [x] 2.3 建立 `src/app/api/paypal/webhook/route.ts` — 驗證 webhook 簽章（無使用者 session）、idempotency 檢查、處理 CHECKOUT.ORDER.APPROVED（直接呼叫 PayPal Capture API）和 PAYMENT.CAPTURE.COMPLETED 事件、透過共用函式 `processPayPalCapture()` 處理後續（與 capture 端點差異僅在 auth 層）
- [x] 2.4 建立 `src/app/api/paypal/retry/route.ts` — 針對取消付款的訂單，驗證訂單歸屬與 pending 狀態，用同一筆 DB 訂單重新建立 PayPal Order（更新 paypal_order_id），**不重複扣除點數與折價券**，回傳新的 approve URL

## 3. 型別、翻譯與 Email

- [x] 3.1 更新 `src/types/index.ts` — PaymentMethod 型別新增 "paypal"（保留 "stripe" 相容歷史資料）
- [x] 3.2 更新 `messages/zh.json` 和 `messages/en.json` — 新增 PayPal 相關翻譯文字（付款方式名稱、按鈕文字、錯誤訊息、取消頁面文字、重新付款按鈕、取消訂單按鈕、點數預扣提示文字）
- [x] 3.3 更新 `src/lib/email.ts` — `EmailOrderData.paymentMethod` 型別新增 "paypal"，郵件模板支援顯示「PayPal 付款」字樣

## 4. 結帳頁面修改

- [x] 4.1 修改 `src/app/checkout/CheckoutClient.tsx` — 將 Stripe Coming Soon 按鈕替換為 PayPal 付款選項（含 PayPal logo 圖示，配色遵循品牌規範 #003087/#009cde）。訂單金額 < NT$32 時 PayPal 選項 disabled 並顯示最低金額提示
- [x] 4.2 英文版結帳頁隱藏貨到付款選項（locale === "en" 時不顯示 COD）
- [x] 4.3 PayPal 提交邏輯 — POST 至 `/api/paypal/create-order`（含 pointsToUse、couponCode），取得 `{ url, orderId }` 後清空購物車（三層），組成 cancel URL 含 orderId，再 redirect 至 PayPal

## 5. 訂單結果頁面

- [x] 5.1 修改 `src/app/order/result/ResultClient.tsx` — 新增 PayPal 回調處理（?paypal=success&token=xxx 時顯示「付款處理中」loading 畫面，呼叫 capture，成功後切換為成功畫面）
- [x] 5.2 新增 PayPal 取消付款 UI（?paypal=cancel&orderId=xxx）— 顯示「付款未完成」畫面，提供「重新付款」按鈕（POST 至 /api/paypal/retry）、「取消訂單」按鈕（POST 至 /api/orders/[id]/cancel，退還點數與折價券）、返回首頁連結，並顯示點數預扣提示文字
- [x] 5.3 新增 PayPal capture 失敗的錯誤狀態 UI — 提供「重新付款」、「取消訂單」按鈕與聯繫客服連結，顯示點數處理提示

## 6. 管理後台適配

- [x] 6.1 管理後台訂單列表支援顯示 payment_method = "paypal" 的訂單標籤
- [x] 6.2 訂單詳情頁顯示 PayPal Order ID 資訊
- [x] 6.3 會員中心訂單紀錄：PayPal 待付款訂單新增「重新付款」按鈕，呼叫 `/api/paypal/retry` 跳轉 PayPal 重新付款

## 7. 測試與驗證

- [x] 7.1 使用 PayPal Sandbox 測試完整付款流程（建立訂單 → 付款 → capture → 訂單狀態更新 → email 發送）
- [x] 7.2 驗證 Stripe Coming Soon 按鈕已移除，PayPal 按鈕正常顯示（含 logo 與品牌配色）
- [ ] 7.3 驗證綠界和貨到付款流程不受影響
- [ ] 7.4 驗證 capture 端點的權限控制（用 A 帳號嘗試 capture B 帳號的訂單應回 403）
- [ ] 7.5 驗證 webhook idempotency（重送相同事件不會重複更新）
- [ ] 7.6 驗證 capture 競態：模擬 Result 頁面與 Webhook 同時觸發 capture，確認不重複扣庫存/寄信
- [ ] 7.7 驗證 create-order 失敗回滾：模擬 PayPal API 失敗，確認 DB 訂單標記為 failed、折價券/點數已回滾
- [x] 7.8 驗證取消付款後「重新付款」按鈕功能正常
- [ ] 7.9 驗證 PayPal 按鈕 rate limiting 生效
- [x] 7.10 驗證點數完整流程：使用 500 點下單 → PayPal 付款成功 → 確認點數已扣 500 → 管理員完成訂單 → 確認回饋點數正確
- [x] 7.11 驗證點數取消退還：使用點數下單 → PayPal 取消 → 點「取消訂單」→ 確認點數已退還
- [x] 7.12 驗證重新付款不重複扣點：使用點數下單 → PayPal 取消 → 點「重新付款」→ 確認不重複扣點 → 完成付款 → 確認點數只扣一次
- [ ] 7.13 驗證 create-order 失敗回滾點數：模擬 PayPal API 失敗 → 確認點數已退還、折價券已回滾

## 8. PayPal 完成後上線檢查清單

- [ ] 8.1 PayPal 商業帳號已註冊並通過驗證（台灣身份）
- [x] 8.2 Sandbox 測試：完整流程跑通（選擇 PayPal → 跳轉付款 → 完成 → 回到結果頁顯示成功）
- [x] 8.3 Sandbox 測試：取消付款流程（PayPal 頁面按取消 → 回到結果頁 → 點「重新付款」→ 完成付款）
- [ ] 8.4 Sandbox 測試：Capture 失敗顯示錯誤畫面
- [ ] 8.5 Sandbox 測試：Webhook 收到通知並正確更新 DB 訂單狀態
- [x] 8.6 Sandbox 測試：優惠券 + 點數折扣 + PayPal 組合正確計算金額
- [ ] 8.7 Sandbox 測試：宅配與超商取貨兩種配送方式皆可搭配 PayPal
- [ ] 8.8 驗證中文版與英文版結帳頁 PayPal 按鈕文字正確顯示
- [ ] 8.9 驗證英文版隱藏貨到付款選項
- [ ] 8.10 驗證管理後台訂單列表能正確顯示 PayPal 訂單（payment_method = "paypal"）
- [ ] 8.11 Vercel 部署環境變數已設定（PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_MODE=live）
- [ ] 8.12 PayPal Dashboard 設定 Live Webhook URL 指向正式網域（https://taiwantea.store/api/paypal/webhook）
- [ ] 8.13 正式環境小額測試：實際用一張信用卡/PayPal 帳號完成一筆真實交易
- [ ] 8.14 確認收到款項進入 PayPal 帳戶餘額
- [ ] 8.15 確認訂單確認信（email）正常發送給買家
