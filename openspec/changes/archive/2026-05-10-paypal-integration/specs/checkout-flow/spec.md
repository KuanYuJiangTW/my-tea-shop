## MODIFIED Requirements

### Requirement: 結帳頁付款方式選擇
結帳頁 SHALL 提供以下付款方式供使用者選擇：ECPay 線上付款、PayPal 國際付款、貨到付款。原本的 Stripe Coming Soon 按鈕由 PayPal 取代。英文版結帳頁 SHALL 隱藏貨到付款選項（國際配送不適用）。

#### Scenario: 選擇 PayPal 付款
- **WHEN** 使用者選擇 PayPal 付款方式並提交結帳表單
- **THEN** 系統 POST 至 `/api/paypal/create-order`，取得 `{ url, orderId }` 後清空購物車（React State + localStorage + Supabase cart_items 三層，與 Stripe 流程一致）並 redirect 至 PayPal 付款頁面（return_url/cancel_url 已由後端設定，前端直接跳轉）

#### Scenario: PayPal 最低金額門檻（前端）
- **WHEN** 訂單總金額（折扣後）低於 NT$32
- **THEN** PayPal 付款選項顯示為 disabled，並提示「PayPal 最低付款金額為 NT$32」

#### Scenario: 選擇 ECPay 付款（不變）
- **WHEN** 使用者選擇線上付款（ECPay）並提交結帳表單
- **THEN** 系統 POST 至 `/api/ecpay/checkout`，取得參數後 form submit 至 ECPay

#### Scenario: 選擇貨到付款（不變）
- **WHEN** 使用者選擇貨到付款並提交結帳表單
- **THEN** 系統 POST 至 `/api/orders`，成功後顯示 COD 成功頁面

#### Scenario: 英文版隱藏貨到付款
- **WHEN** 使用者瀏覽英文版結帳頁（locale = "en"）
- **THEN** 不顯示貨到付款選項，僅顯示 ECPay 與 PayPal

> **Trade-off 備註**：以語系判斷而非配送地區判斷是簡化方案。台灣人切換英文介面會看不到 COD。此為已知取捨，Phase 2 國際配送時再依地區判斷。

### Requirement: PaymentMethod 型別擴充
`PaymentMethod` 型別 SHALL 包含 `"online" | "cod" | "stripe" | "paypal"` 四種值。保留 "stripe" 以相容歷史訂單資料。

#### Scenario: 型別定義
- **WHEN** 程式碼中使用 `PaymentMethod` 型別
- **THEN** 接受 `"online"`、`"cod"`、`"stripe"`、`"paypal"` 四種值

### Requirement: 訂單摘要付款方式顯示
訂單摘要側欄 SHALL 根據選擇的付款方式顯示對應的標籤文字。

#### Scenario: 顯示 PayPal 標籤
- **WHEN** 使用者選擇 PayPal 付款
- **THEN** 訂單摘要顯示「PayPal 國際付款」（中文）或「PayPal (Credit/Debit Card)」（英文）

### Requirement: 提交按鈕文字
提交按鈕 SHALL 根據付款方式顯示對應文字。

#### Scenario: PayPal 按鈕文字
- **WHEN** 使用者選擇 PayPal 付款
- **THEN** 按鈕顯示「前往 PayPal 付款」（中文）或「Pay with PayPal」（英文）

> **品牌規範**：PayPal 付款選項卡和提交按鈕應包含 PayPal logo 圖示，配色遵循 PayPal 品牌指南（PayPal Blue #003087 / #009cde）。
