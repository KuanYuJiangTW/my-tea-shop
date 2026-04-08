## ADDED Requirements

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
