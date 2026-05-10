## 1. 環境變數與資料庫

- [x] 1.1 在 `.env.example` 新增 PayPal 相關環境變數（PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_MODE）
- [x] 1.2 orders 資料表新增 `paypal_order_id` 欄位（`supabase/add_paypal_order_id.sql`）
- [x] 1.3 實作 `src/lib/paypal.ts`（token 快取、建單、capture、webhook 驗簽、共用 capture 處理）
- [x] 1.4 實作 `src/lib/rate-limit.ts`（記憶體 rate limiter，支援 IP 追蹤）

## 2. PayPal 建立訂單

- [x] 2.1 實作 `POST /api/paypal/create-order`（Origin 驗證、Rate Limit）
- [x] 2.2 後端驗價、庫存驗證、運費計算（與 COD/ECPay 相同邏輯）
- [x] 2.3 優惠券驗證與使用
- [x] 2.4 點數折抵驗證與扣除（最低 200 點、100 倍數、不超過訂單 10%、餘額足夠）
- [x] 2.5 建立 DB 訂單（`payment_method: "paypal"`, `payment_status: "pending"`）
- [x] 2.6 呼叫 PayPal API 建立 Order（TWD、PAY_NOW）
- [x] 2.7 PayPal 建單失敗時回滾點數、優惠券，訂單標記 `failed`
- [x] 2.8 支援宅配與超商取貨（7-11 / 全家 / 萊爾富）

## 3. PayPal Capture（前端觸發）

- [x] 3.1 實作 `POST /api/paypal/capture`（驗證用戶身份與訂單歸屬，防越權）
- [x] 3.2 冪等處理：已 paid 直接回傳成功
- [x] 3.3 Capture 成功後更新 `payment_status = "paid"`
- [x] 3.4 原子性扣減庫存（`decrement_stock` RPC）
- [x] 3.5 庫存扣減失敗時標記 `order_status = "stock_issue"`
- [x] 3.6 寄送訂單確認 Email
- [x] 3.7 競態處理：`ORDER_ALREADY_CAPTURED` (422) 視為成功

## 4. PayPal Webhook

- [x] 4.1 實作 `POST /api/paypal/webhook`
- [x] 4.2 PayPal 簽章驗證（`/v1/notifications/verify-webhook-signature`）
- [x] 4.3 處理 `CHECKOUT.ORDER.APPROVED`（觸發 capture）
- [x] 4.4 處理 `PAYMENT.CAPTURE.COMPLETED`（更新狀態）
- [x] 4.5 冪等：已 paid 訂單不重複處理
- [x] 4.6 一律回傳 200 OK（避免 PayPal 重試迴圈）

## 5. PayPal 重試

- [x] 5.1 實作 `POST /api/paypal/retry`（用戶取消後重新產生付款連結，不重複扣點數/優惠券）

## 6. 型別、翻譯與 Email

- [x] 6.1 更新 `src/types/index.ts` — PaymentMethod 型別新增 "paypal"（保留 "stripe" 相容歷史資料）
- [x] 6.2 更新 `messages/zh.json` 和 `messages/en.json` — 新增 PayPal 相關翻譯鍵（付款方式、按鈕、錯誤訊息、取消頁面、重試按鈕）
- [x] 6.3 更新 `src/lib/email.ts` — 郵件模板支援顯示「PayPal 付款」字樣

## 7. 前端整合

- [x] 7.1 結帳頁新增 PayPal 付款選項（最低 NT$32，含 PayPal logo 品牌配色 #003087/#009cde）
- [x] 7.2 英文版隱藏貨到付款選項（`locale !== "en"`）
- [x] 7.3 PayPal 提交邏輯（POST → 清空購物車 → redirect PayPal）
- [x] 7.4 PayPal 付款結果頁：capture loading → 成功畫面
- [x] 7.5 PayPal 取消付款 UI：重新付款按鈕 + 取消訂單按鈕 + 點數預扣提示
- [x] 7.6 PayPal capture 失敗錯誤 UI：重新付款 + 取消訂單 + 聯繫客服

## 8. 管理後台與會員中心

- [x] 8.1 管理後台訂單列表顯示 PayPal 付款方式標籤
- [x] 8.2 管理後台訂單詳情顯示 `paypal_order_id`
- [x] 8.3 會員中心訂單紀錄：PayPal 待付款訂單新增「重新付款」按鈕

## 9. 訂單取消整合

- [x] 9.1 PayPal pending 訂單取消：不還原庫存（尚未扣過）
- [x] 9.2 PayPal paid 訂單取消：還原庫存
- [x] 9.3 取消時退還優惠券與點數
- [x] 9.4 修復取消訂單庫存多還 Bug（`shouldRestoreStock` 邏輯修正）

## 10. 自動化測試（113 tests，全部通過）

- [x] 10.1 paypal-lib.test.ts — SDK 封裝測試
- [x] 10.2 create-order.test.ts — 建單 API 測試
- [x] 10.3 capture.test.ts — capture 流程測試（成功/失敗/冪等/權限）
- [x] 10.4 webhook.test.ts — webhook 事件處理測試（驗簽/事件/冪等）
- [x] 10.5 retry.test.ts — 重試 API 測試
- [x] 10.6 cancel-order.test.ts — 取消訂單庫存/優惠券/點數還原
- [x] 10.7 race-condition.test.ts — 競態條件測試
- [x] 10.8 rate-limit.test.ts — Rate Limiter 測試
- [x] 10.9 integration-verification.test.ts — 整合驗證（翻譯、路由、管理後台、COD 隱藏）

## 11. 上線驗證

- [x] 11.1 Sandbox 完整付款流程測試
- [x] 11.2 Sandbox 取消付款 → 重新付款流程測試
- [x] 11.3 Sandbox Webhook 通知與 DB 狀態同步
- [x] 11.4 Sandbox 優惠券 + 點數 + PayPal 組合金額計算
- [x] 11.5 Sandbox 宅配與超商取貨配送方式搭配測試
- [x] 11.6 中英文版 PayPal 按鈕翻譯驗證
- [x] 11.7 英文版隱藏貨到付款驗證
- [x] 11.8 管理後台 PayPal 訂單顯示驗證
- [x] 11.9 Vercel 環境變數設定（PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_MODE=live）
- [x] 11.10 PayPal Dashboard Live Webhook URL 設定
- [x] 11.11 Live 小額測試完成
