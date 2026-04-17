## MODIFIED Requirements

### Requirement: 訂單結果頁回調來源判斷
訂單結果頁 SHALL 根據 URL query params 區分 ECPay 和 Stripe 的回調來源，並顯示對應的成功或失敗畫面。

#### Scenario: Stripe 付款成功
- **WHEN** URL 包含 `?stripe=success`
- **THEN** 顯示付款成功畫面（與 ECPay 成功頁相同的 UI），不顯示訂單編號（Stripe 回調不帶 trade no）

#### Scenario: Stripe 付款取消
- **WHEN** URL 包含 `?stripe=cancel`
- **THEN** 顯示付款未完成畫面，提供返回首頁及購物車連結

#### Scenario: ECPay 回調（不變）
- **WHEN** URL 包含 `?RtnCode=1`
- **THEN** 顯示 ECPay 付款成功畫面，包含訂單編號
