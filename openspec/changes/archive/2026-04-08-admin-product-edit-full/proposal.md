## Why

後台產品管理的編輯功能目前只能修改名稱、售價、庫存與上下架狀態，無法編輯商品中文名稱以外的內容欄位（英文名稱、分類、產地、海拔、重量、描述、背景色、圖片 URL），導致管理員新增商品後若需要修正任何內容資料，只能直接操作 Supabase 資料庫。

## What Changes

- 後台產品編輯表單新增所有內容欄位：英文名稱、分類、產地、海拔、重量規格、描述、背景色（色票選擇器）、封面圖片 URL、第二張圖片 URL
- `PATCH /api/admin/products/[id]` 接受並寫入上述新增欄位
- 編輯展開後分兩個區塊：「內容資料」（現有欄位 + 新增欄位）與「規格售價與庫存」（維持現有）

## Capabilities

### New Capabilities

### Modified Capabilities
- `admin-product-management`：商品編輯功能可修改所有欄位，包含內容資料與圖片。

## Impact

- `src/app/admin/(protected)/products/ProductsClient.tsx`：`EditState` type 新增欄位、`startEdit()` 初始化、編輯區塊 UI 擴充
- `src/app/api/admin/products/[id]/route.ts`：PATCH handler 新增欄位支援
