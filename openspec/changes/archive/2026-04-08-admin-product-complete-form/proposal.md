## Why

後台新增商品表單目前只有 slug 和售價，名稱、圖片、產地、描述等前台必要欄位都缺少，導致上架後前台顯示不完整。Sanity Studio 雖已規劃為內容管理工具，但前台目前完全只讀 Supabase，Sanity 填寫的內容不會出現在前台，造成管理員需要在兩個系統各填一遍卻徒勞無功的困境。管理員應能在後台一個地方完成新商品的所有資料填寫，直接上架而不需要寫程式或使用其他工具。

## What Changes

- 後台新增商品表單新增所有前台必要欄位：商品名稱（中/英文）、分類、產地、海拔、重量規格、描述、顏色標籤、封面圖片 URL、第二張圖片 URL
- `POST /api/admin/products` 接受並寫入上述新增欄位
- 新商品建立後，管理員可立即在後台調整上架狀態，不需前往 Sanity Studio

## Capabilities

### New Capabilities
<!-- 無新 capability，屬於既有 admin-product-management 的需求擴充 -->

### Modified Capabilities
- `admin-product-management`：新增商品時可填寫完整內容欄位（名稱、圖片、產地、描述等），不再只限 slug 與售價。

## Impact

- `src/app/admin/(protected)/products/ProductsClient.tsx`：新增表單加入內容欄位
- `src/app/api/admin/products/route.ts`：POST handler 接受新欄位
- Supabase `products` 資料表：現有欄位（name、name_en、category、origin、altitude、weight、description、color、image_url、image_url2）已存在，無需 migration
