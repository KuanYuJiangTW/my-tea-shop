## MODIFIED Requirements

### Requirement: 結帳頁付款方式選擇
結帳頁 SHALL 提供三種付款方式供使用者選擇：ECPay 線上付款、Stripe 國際付款、貨到付款。

#### Scenario: 選擇 Stripe 付款
- **WHEN** 使用者選擇 Stripe 付款方式並提交結帳表單
- **THEN** 系統 POST 至 `/api/stripe/checkout`，取得 redirect URL 後清空購物車並導向 Stripe Checkout 頁面

#### Scenario: 選擇 ECPay 付款（不變）
- **WHEN** 使用者選擇線上付款（ECPay）並提交結帳表單
- **THEN** 系統 POST 至 `/api/ecpay/checkout`，取得參數後 form submit 至 ECPay

#### Scenario: 選擇貨到付款（不變）
- **WHEN** 使用者選擇貨到付款並提交結帳表單
- **THEN** 系統 POST 至 `/api/orders`，成功後顯示 COD 成功頁面

### Requirement: PaymentMethod 型別擴充
`PaymentMethod` 型別 SHALL 包含 `"online" | "cod" | "stripe"` 三種值。

#### Scenario: 型別定義
- **WHEN** 程式碼中使用 `PaymentMethod` 型別
- **THEN** 接受 `"online"`、`"cod"`、`"stripe"` 三種值

### Requirement: 訂單摘要付款方式顯示
訂單摘要側欄 SHALL 根據選擇的付款方式顯示對應的標籤文字。

#### Scenario: 顯示 Stripe 標籤
- **WHEN** 使用者選擇 Stripe 付款
- **THEN** 訂單摘要顯示「Stripe 國際付款」（中文）��「Stripe」（英文）

### Requirement: 提交按鈕文字
提交按鈕 SHALL 根據付款方式顯示對應文字。

#### Scenario: Stripe 按鈕文字
- **WHEN** 使用者選擇 Stripe 付款
- **THEN** 按鈕顯示「前往 Stripe 付款」（中文）或「Pay with Stripe」（英文）
