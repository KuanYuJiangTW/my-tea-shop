# admin-product-management Specification

## Purpose
後台商品的新增、編輯、刪除與上下架，含 75g 與茶包兩種規格可各自停用（價格與庫存留空）的行為。

## Requirements

### Requirement: 後台可查詢所有商品列表
系統 SHALL 提供 `GET /api/admin/products`，回傳所有商品依 `id` 升序排列（含下架商品）。

#### Scenario: 查詢商品列表
- **WHEN** 管理員呼叫 `GET /api/admin/products`
- **THEN** 回傳所有商品完整資料（包含 `is_active = false` 的商品）

### Requirement: 後台可更新商品的價格、庫存與上下架狀態
系統 SHALL 接受任意欄位子集進行部分更新（partial update），僅更新有傳入的欄位。

可更新欄位：`name`、`price`、`stock_quantity`、`price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag`、`is_active`

#### Scenario: 更新商品庫存
- **WHEN** `PATCH /api/admin/products/[id]` 傳入 `{ stock_quantity: 50 }`
- **THEN** 僅更新 `stock_quantity`，其餘欄位不變

#### Scenario: 下架商品
- **WHEN** `PATCH /api/admin/products/[id]` 傳入 `{ is_active: false }`
- **THEN** 商品 `is_active` 更新為 `false`，前台不再顯示

#### Scenario: 無任何更新欄位
- **WHEN** 請求 body 為空或無有效欄位
- **THEN** 系統回傳 HTTP 400 `{ error: "No fields to update" }`

### Requirement: 75g 規格與茶包規格價格/庫存可設為 null（停用該規格）
系統 SHALL 允許 `price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag` 設定為 `null`，表示停用該規格。

#### Scenario: 停用 75g 規格
- **WHEN** `PATCH /api/admin/products/[id]` 傳入 `{ price_75g: null, stock_75g: null }`
- **THEN** 商品 `price_75g` 與 `stock_75g` 更新為 null，前台下單時拒絕 75g 規格

### Requirement: 後台可新增商品
系統 SHALL 提供 `POST /api/admin/products`，接受商品資料並建立新商品記錄，新商品預設為下架狀態（`is_active = false`）。

必填欄位：`slug`（kebab-case 格式）、`price`（150g 售價，0 或正整數）
選填欄位：`name`（商品中文名稱；若未填，預設使用 slug）、`name_en`、`category`、`origin`、`altitude`、`weight`、`description`、`color`、`image_url`、`image_url2`、`price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag`、`stock_quantity`、`is_featured`

#### Scenario: 成功新增商品（最小必填）
- **WHEN** `POST /api/admin/products` 傳入 `{ slug: "dong-fang-mei-ren", price: 1200 }`
- **THEN** 系統建立新商品，`is_active` 預設為 `false`，`name` 預設為 slug，回傳 HTTP 201 與完整商品物件（含 `id`）

#### Scenario: 成功新增商品（含選填欄位）
- **WHEN** `POST /api/admin/products` 傳入必填欄位加上 `name`、`name_en`、`category`、`price_75g` 等選填欄位
- **THEN** 系統建立商品並將所有傳入欄位儲存，回傳 HTTP 201 與完整商品物件

#### Scenario: 缺少必填欄位 slug
- **WHEN** `POST /api/admin/products` 傳入 `{ price: 1200 }`（無 `slug`）
- **THEN** 系統回傳 HTTP 400 `{ error: "商品 slug 為必填" }`

#### Scenario: 缺少必填欄位 price
- **WHEN** `POST /api/admin/products` 傳入 `{ slug: "dong-fang-mei-ren" }`（無 `price`）
- **THEN** 系統回傳 HTTP 400 `{ error: "150g 售價為必填" }`

#### Scenario: price 為無效數值
- **WHEN** `POST /api/admin/products` 傳入 `{ slug: "dong-fang-mei-ren", price: -100 }`
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
- **WHEN** 管理員未填寫 slug 或售價即點擊「建立商品」
- **THEN** 表單顯示欄位錯誤提示，不送出 API 請求

#### Scenario: API 錯誤
- **WHEN** `POST /api/admin/products` 回傳錯誤
- **THEN** 表單顯示錯誤訊息，不清空已填內容

### Requirement: 後台可刪除商品
系統 SHALL 提供 `DELETE /api/admin/products/[id]`，將指定商品從 Supabase `products` 資料表中永久刪除。

#### Scenario: 成功刪除商品
- **WHEN** 管理員呼叫 `DELETE /api/admin/products/[id]`
- **THEN** 系統刪除該筆商品並回傳 HTTP 200 `{ ok: true }`

#### Scenario: 刪除不存在的商品
- **WHEN** 管理員呼叫 `DELETE /api/admin/products/[id]`，但該 id 不存在
- **THEN** 系統回傳 HTTP 200 `{ ok: true }`（冪等）

### Requirement: 後台刪除商品前須顯示確認對話框
系統 SHALL 在管理員點擊刪除按鈕後，顯示含商品名稱的確認 modal，管理員點擊確認後才執行刪除；點擊取消則關閉 modal 不執行任何操作。

#### Scenario: 點擊刪除顯示確認 modal
- **WHEN** 管理員點擊商品列的「刪除」按鈕
- **THEN** 畫面顯示確認 modal，內容包含該商品名稱

#### Scenario: 確認刪除
- **WHEN** 管理員在確認 modal 點擊「確認刪除」
- **THEN** 系統呼叫 DELETE API，成功後該商品從列表消失，modal 關閉

#### Scenario: 取消刪除
- **WHEN** 管理員在確認 modal 點擊「取消」
- **THEN** modal 關閉，商品列表不變

#### Scenario: 編輯中的商品不顯示刪除按鈕
- **WHEN** 商品處於編輯狀態（已展開編輯表單）
- **THEN** 該商品的刪除按鈕不顯示

### Requirement: 管理員可上傳商品圖片至 Supabase Storage
系統 SHALL 提供 `POST /api/admin/upload-image` API，接受單張圖片檔案，上傳至 Supabase Storage `product-images` bucket，回傳公開圖片 URL。

#### Scenario: 成功上傳圖片
- **WHEN** 管理員呼叫 `POST /api/admin/upload-image` 附帶圖片檔案與商品 slug
- **THEN** 系統將圖片儲存至 `product-images/{slug}/{timestamp}-{filename}`，回傳 HTTP 200 與圖片公開 URL

#### Scenario: 未授權請求
- **WHEN** 未登入的使用者呼叫上傳 API
- **THEN** 系統回傳 HTTP 401

### Requirement: 後台商品圖片區塊改為檔案上傳器
系統 SHALL 在新增商品與編輯商品的圖片區塊，提供檔案選擇器取代純文字 URL 輸入，支援最多 5 張圖片，並顯示縮圖預覽。

#### Scenario: 選擇圖片後立即上傳並顯示預覽
- **WHEN** 管理員點擊「選擇圖片」並選取圖片檔案
- **THEN** 系統立即上傳至 Supabase Storage，成功後顯示縮圖預覽

#### Scenario: 達到上限後無法繼續新增
- **WHEN** 已上傳 5 張圖片
- **THEN** 「選擇圖片」按鈕隱藏或停用，不允許繼續上傳

#### Scenario: 刪除已上傳圖片
- **WHEN** 管理員點擊縮圖上的刪除按鈕
- **THEN** 該圖片 URL 從 gallery 移除，縮圖消失

#### Scenario: 送出新增/儲存時 gallery 寫入資料庫
- **WHEN** 管理員送出新增商品或儲存編輯
- **THEN** `gallery` 欄位寫入所有已上傳圖片的 URL 陣列
