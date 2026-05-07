## Context

目前結帳頁面支援三種付款方式：綠界（ECPay）、Stripe（Coming Soon）、貨到付款。由於 Stripe 不支援台灣商家註冊正式帳號，需以 PayPal 取代作為國際金流方案。前端移除 Stripe Coming Soon 按鈕改為 PayPal，後端 Stripe API 路由保留不動。

PayPal 整合採用 PayPal REST API v2（Orders API），流程與 Stripe 類似：前端觸發 → 後端建立訂單 → 導向 PayPal 付款 → webhook 確認。

## Goals / Non-Goals

**Goals:**
- 新增 PayPal 作為國外客人的付款方式
- 將 Stripe Coming Soon 按鈕位置替換為 PayPal 按鈕（Stripe 後端程式碼保留）
- PayPal 付款流程與現有綠界流程體驗一致（建立訂單 → 跳轉付款 → 回調顯示結果）
- 支援 PayPal webhook 自動更新訂單狀態

**Non-Goals:**
- 不刪除 Stripe 程式碼
- 不做 PayPal 訂閱/定期付款
- 不做幣別轉換（以 TWD 計價，PayPal 自動處理買家端匯率顯示）
- 不做 PayPal 退款功能（本次不含）
- 不做國際運費計算與國際配送（本次僅支援台灣境內配送）
- 不做廢棄訂單自動清理（PayPal pending 訂單的定期清理留待後續）

> **目標客群釐清**：PayPal 本次主要服務「在台灣但沒有台灣銀行卡的外籍人士」及「偏好 PayPal 的消費者」，而非海外跨境購物。國際配送（含國際運費計算）列為 Phase 2 規劃。

## Decisions

### 1. 使用 PayPal REST API v2 直接呼叫，不用 SDK

**選擇**: 直接使用 `fetch` 呼叫 PayPal REST API v2（Orders API）
**替代方案**: `@paypal/checkout-server-sdk`（已棄用）、`@paypal/paypal-server-sdk`
**原因**: PayPal 官方 Node SDK 更迭頻繁且文件品質不穩定，REST API 穩定且文件清楚。減少依賴，降低升級風險。

### 2. 付款流程採用 Server-side redirect（非前端 JS SDK）

**選擇**: 後端建立 PayPal Order → 回傳 approve URL → 前端 redirect
**替代方案**: 前端嵌入 PayPal JS SDK Smart Buttons
**原因**: 與現有 Stripe/ECPay 流程一致（都是跳轉），前端改動最小，且不需要載入額外 JS。

### 3. Stripe 處理方式

**選擇**: 前端移除 Stripe Coming Soon 按鈕，直接以 PayPal 按鈕取代；後端 API 路由保留不動
**原因**: Stripe 後端程式碼未來若取得海外帳號可直接啟用，前端只需再加回選項即可。不需要環境變數控制，減少複雜度。

### 4. PayPal Webhook 驗證

**選擇**: 使用 PayPal Webhook Notification Verification API 驗證簽章
**原因**: 確保 webhook 來源正確，防止偽造付款通知。

## Risks / Trade-offs

- **[PayPal 手續費較高 4.4%]** → 無法避免，由商家吸收，已包含在現有定價策略中，不另外加收。國際客戶體驗優先，且訂單量初期不大
- **[TWD 非 PayPal 主要幣別]** → PayPal 支援 TWD，買家看到的是自動換算後的本地貨幣
- **[PayPal 帳號凍結風險]** → 正常經營電商不會觸發，保持交易紀錄透明即可
- **[Webhook 延遲]** → 同時在 return URL 做 capture，不完全依賴 webhook
- **[PayPal 最低金額 ~NT$32]** → 前端/後端驗證最低金額，低於門檻不允許 PayPal 付款
- **[Capture 端點安全]** → 必須驗證 PayPal Order ID 對應的 DB 訂單屬於當前使用者
- **[Webhook replay attack]** → 用 PayPal capture ID 做 idempotency 檢查，防止重複處理
- **[Capture 競態條件]** → Result 頁面和 Webhook 可能同時觸發 capture，DB 更新需用 SELECT FOR UPDATE 鎖定 + payment_status 檢查實現冪等
- **[訂單建立失敗]** → DB 訂單建立成功但 PayPal API 失敗時，需將訂單標記為 failed 並回滾庫存/折價券
- **[廢棄 pending 訂單]** → 使用者放棄 PayPal 付款會留下 pending 訂單，PayPal Order 72 小時後過期，DB 訂單需未來加定期清理
- **[TWD 幣別相容性]** → PayPal 支援 TWD，但部分國家帳號可能不支援接收 TWD 訂單，需有明確錯誤提示引導使用者改用其他付款方式
- **[購物車清空 vs 取消付款]** → redirect 前清空購物車（與 Stripe 一致），但使用者取消付款回來後購物車已空，需在取消頁面提供「重新付款」按鈕（用同一筆 DB 訂單重建 PayPal Order）
