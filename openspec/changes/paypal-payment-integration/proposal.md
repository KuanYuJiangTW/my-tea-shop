# PayPal 付款整合

## What — 變更內容

為霧抉茶電商平台整合 PayPal 國際支付，讓海外客戶可以使用 PayPal 完成付款。

### 功能範圍
1. **PayPal 核心函式庫** — Token 快取、建立訂單、Capture、Webhook 簽章驗證
2. **建立訂單 API** — 驗證商品/庫存/優惠券/積分，建立 pending 訂單後跳轉 PayPal
3. **Capture API** — 用戶核准後 capture 付款，扣庫存、更新狀態、寄確認信
4. **Webhook API** — 接收 PayPal 事件通知，處理非同步付款確認
5. **重試付款 API** — 取消後可重新發起 PayPal 付款
6. **前端整合** — 結帳頁 PayPal 選項、付款結果頁（成功/取消/失敗）
7. **自動化測試** — 63 個測試覆蓋所有 API 路由和核心邏輯
8. **Bug 修復** — 取消訂單時 PayPal pending 訂單庫存多還問題

## Why — 變更原因

- 原有支付只支援綠界（台灣本地）和 Stripe，缺少 PayPal 國際支付管道
- PayPal 在東南亞和歐美市場使用率高，增加轉換率
- 需要處理 PayPal 特有的非同步付款流程（redirect → approve → capture）
- 需要確保冪等性，避免 Webhook 與前端 capture 的競態問題
