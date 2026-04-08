## Why

目前後台產品管理頁（`/admin/products`）只能編輯現有商品的庫存、價格與上下架，無法新增商品。當茶莊推出新品時，必須直接操作資料庫才能上架，管理員無法自助完成。本次新增「建立商品」功能，讓管理員在後台直接新增新商品記錄。

## What Changes

- `POST /api/admin/products`：新增建立商品 API
- 後台產品管理頁新增「新增商品」按鈕，點擊展開新增表單
- 表單必填：商品名稱（中文）、150g 售價
- 表單選填：英文名稱、分類、產地、海拔、重量說明、商品描述、顏色、圖片 URL（主圖/副圖）、75g 規格價格/庫存、茶包規格價格/庫存、150g 庫存、是否精選、是否上架

## Capabilities

### New Capabilities

（無新 capability，屬於現有 admin-product-management 的擴充）

### Modified Capabilities

- `admin-product-management`: 新增建立商品功能（原只有查詢與更新）

## Impact

**新增 API**：`POST /api/admin/products`
**修改頁面**：`src/app/admin/(protected)/products/ProductsClient.tsx`（新增表單 UI）
**無資料庫 Schema 變動**（使用現有 `products` 資料表）
