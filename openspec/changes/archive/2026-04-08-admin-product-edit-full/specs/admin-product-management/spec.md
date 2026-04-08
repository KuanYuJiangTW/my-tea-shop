## MODIFIED Requirements

### Requirement: 後台可更新商品的價格、庫存與上下架狀態
系統 SHALL 接受任意欄位子集進行部分更新（partial update），僅更新有傳入的欄位。

可更新欄位：`name`、`name_en`、`category`、`origin`、`altitude`、`weight`、`description`、`color`、`image_url`、`image_url2`、`price`、`stock_quantity`、`price_75g`、`stock_75g`、`price_tea_bag`、`stock_tea_bag`、`is_active`

#### Scenario: 更新商品內容欄位
- **WHEN** `PATCH /api/admin/products/[id]` 傳入 `{ name_en: "Oriental Beauty", origin: "新竹峨眉" }`
- **THEN** 僅更新 `name_en` 與 `origin`，其餘欄位不變

#### Scenario: 更新商品庫存
- **WHEN** `PATCH /api/admin/products/[id]` 傳入 `{ stock_quantity: 50 }`
- **THEN** 僅更新 `stock_quantity`，其餘欄位不變

#### Scenario: 下架商品
- **WHEN** `PATCH /api/admin/products/[id]` 傳入 `{ is_active: false }`
- **THEN** 商品 `is_active` 更新為 `false`，前台不再顯示

#### Scenario: 無任何更新欄位
- **WHEN** 請求 body 為空或無有效欄位
- **THEN** 系統回傳 HTTP 400 `{ error: "No fields to update" }`

## ADDED Requirements

### Requirement: 後台商品編輯表單可修改所有欄位
系統 SHALL 在後台產品列表的編輯展開區塊提供所有可編輯欄位，分為「內容資料」與「規格售價與庫存」兩個子區塊。

內容資料可編輯欄位：`name`、`name_en`、`category`、`origin`、`altitude`、`weight`、`description`、`color`（色票選擇器）、`image_url`、`image_url2`

#### Scenario: 開啟編輯展開後顯示所有欄位
- **WHEN** 管理員點擊商品的「編輯」按鈕
- **THEN** 展開區塊顯示「內容資料」子區塊（含色票選擇器）與「規格售價與庫存」子區塊

#### Scenario: 修改商品描述並儲存
- **WHEN** 管理員修改描述欄位後點擊「儲存」
- **THEN** 系統呼叫 PATCH API 寫入新描述，前台商品頁立即更新

#### Scenario: 修改背景色並儲存
- **WHEN** 管理員在編輯區塊選擇不同色票後點擊「儲存」
- **THEN** `color` 欄位更新，前台商品卡片背景色立即變更
