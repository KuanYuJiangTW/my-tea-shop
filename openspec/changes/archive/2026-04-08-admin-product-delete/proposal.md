## Why

後台產品管理目前只能上下架商品，無法刪除，導致測試或錯誤建立的商品只能直接操作 Supabase 資料庫才能移除，管理員無法獨立處理。

## What Changes

- 後台產品列表每筆商品新增「刪除」按鈕
- 點擊刪除後跳出確認對話框，顯示商品名稱，要求二次確認才執行
- 新增 `DELETE /api/admin/products/[id]` API，執行實際刪除

## Capabilities

### New Capabilities

### Modified Capabilities
- `admin-product-management`：新增刪除商品需求，包含確認對話框防止誤刪。

## Impact

- `src/app/admin/(protected)/products/ProductsClient.tsx`：新增刪除按鈕與確認 modal
- `src/app/api/admin/products/[id]/route.ts`：新增 DELETE handler
