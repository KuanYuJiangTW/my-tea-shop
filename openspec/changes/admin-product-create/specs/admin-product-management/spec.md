## ADDED Requirements

### Requirement: 後台可新增商品
系統 SHALL 提供 `POST /api/admin/products`，接受商品資料並建立新商品記錄，新商品預設為下架狀態（`is_active = false`）。

必填欄位：`name`（中文商品名稱）、`price`（150g 售價，正整數）
選填欄位：`name_en`、`category`、`origin`、`altitude`、`weight`、`description`、`color`、`image_url`、`image_url_2`、`price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag`、`stock_quantity`、`is_featured`

#### Scenario: 成功新增商品（最小必填）
- **WHEN** `POST /api/admin/products` 傳入 `{ name: "東方美人", price: 1200 }`
- **THEN** 系統建立新商品，`is_active` 預設為 `false`，回傳 HTTP 201 與完整商品物件（含 `id`）

#### Scenario: 成功新增商品（含選填欄位）
- **WHEN** `POST /api/admin/products` 傳入必填欄位加上 `name_en`、`category`、`price_75g` 等選填欄位
- **THEN** 系統建立商品並將所有傳入欄位儲存，回傳 HTTP 201 與完整商品物件

#### Scenario: 缺少必填欄位 name
- **WHEN** `POST /api/admin/products` 傳入 `{ price: 1200 }`（無 `name`）
- **THEN** 系統回傳 HTTP 400 `{ error: "商品名稱為必填" }`

#### Scenario: 缺少必填欄位 price
- **WHEN** `POST /api/admin/products` 傳入 `{ name: "東方美人" }`（無 `price`）
- **THEN** 系統回傳 HTTP 400 `{ error: "150g 售價為必填" }`

#### Scenario: price 為無效數值
- **WHEN** `POST /api/admin/products` 傳入 `{ name: "東方美人", price: -100 }`
- **THEN** 系統回傳 HTTP 400 `{ error: "售價須為 0 或正整數" }`

### Requirement: 後台產品管理頁提供新增商品表單
系統 SHALL 在後台產品管理頁（`/admin/products`）頂部提供「+ 新增商品」按鈕，點擊後展開內嵌新增表單；提交成功後新商品立即出現在列表頂部，無需重新整理頁面。

#### Scenario: 展開新增表單
- **WHEN** 管理員點擊「+ 新增商品」按鈕
- **THEN** 頁面頂部展開新增商品表單，顯示所有可輸入欄位，按鈕變為「收起」

#### Scenario: 成功新增商品
- **WHEN** 管理員填入必填欄位並點擊「建立商品」
- **THEN** 系統呼叫 `POST /api/admin/products`，成功後新商品插入列表最頂部，表單收起並清空，顯示「商品已建立 ✓」訊息

#### Scenario: 必填欄位未填寫
- **WHEN** 管理員未填寫商品名稱或售價即點擊「建立商品」
- **THEN** 表單顯示欄位錯誤提示，不送出 API 請求

#### Scenario: API 錯誤
- **WHEN** `POST /api/admin/products` 回傳錯誤
- **THEN** 表單顯示錯誤訊息，不清空已填內容
