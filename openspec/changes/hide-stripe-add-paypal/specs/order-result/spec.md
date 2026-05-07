## MODIFIED Requirements

### Requirement: 訂單結果頁回調來源判斷
訂單結果頁 SHALL 根據 URL query params 區分 ECPay、PayPal 和 Stripe 的回調來源，並顯示對應的成功、失敗或錯誤畫面。

#### Scenario: PayPal 付款成功
- **WHEN** URL 包含 `?paypal=success&token=<paypal-order-id>`
- **THEN** 前端顯示「付款處理中，請稍候...」loading 畫面，POST 至 `/api/paypal/capture` 完成捕獲，成功後切換為付款成功畫面

#### Scenario: PayPal 付款取消
- **WHEN** URL 包含 `?paypal=cancel&orderId=<db-order-id>`
- **THEN** 顯示付款未完成畫面，包含：
  - 「重新付款」按鈕（POST 至 `/api/paypal/retry`，不重複扣點數/折價券）
  - 「取消訂單」按鈕（POST 至 `/api/orders/[id]/cancel`，退還已扣點數與折價券）
  - 返回首頁連結
  - 提示文字：「您的點數與折價券已預扣，重新付款不會再次扣除。若不需要此訂單，請點擊取消訂單以退還點數。」

> **UX 備註**：因 redirect 前已清空購物車，使用者取消回來後無法回到購物車重建訂單。提供「重新付款」和「取消訂單」兩個明確出口，讓使用者自行決定。

#### Scenario: PayPal Capture 失敗
- **WHEN** 前端呼叫 `/api/paypal/capture` 回傳錯誤
- **THEN** 顯示付款處理失敗畫面，包含：
  - 「重新付款」按鈕（同上 retry 邏輯）
  - 「取消訂單」按鈕（退還點數與折價券）
  - 聯繫客服連結
  - 提示文字：「付款處理失敗，您可以重新嘗試或取消訂單退還點數。」

#### Scenario: ECPay 回調（不變）
- **WHEN** URL 包含 `?RtnCode=1`
- **THEN** 顯示 ECPay 付款成功畫面，包含訂單編號

#### Scenario: Stripe 回調（不變）
- **WHEN** URL 包含 `?stripe=success`
- **THEN** 顯示付款成功畫面
