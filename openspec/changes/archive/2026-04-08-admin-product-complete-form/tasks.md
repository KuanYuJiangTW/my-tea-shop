## 1. 擴充 POST API

- [x] 1.1 `route.ts`：POST handler 接受並寫入 `name`、`name_en`、`category`、`origin`、`altitude`、`weight`、`description`、`color`、`image_url`、`image_url2` 欄位

## 2. 擴充後台新增商品表單

- [x] 2.1 `ProductsClient.tsx`：`CreateForm` type 新增所有內容欄位
- [x] 2.2 `ProductsClient.tsx`：`EMPTY_CREATE_FORM` 新增對應欄位初始值
- [x] 2.3 `ProductsClient.tsx`：新增表單 UI 加入「基本資料」區塊（name、name_en、category、origin、altitude、weight、color）
- [x] 2.4 `ProductsClient.tsx`：新增表單 UI 加入「圖片」區塊（image_url、image_url2）
- [x] 2.5 `ProductsClient.tsx`：`createProduct()` 送出時包含所有新欄位

## 3. 驗收測試

- [x] 3.1 填寫完整欄位新增商品 → Supabase 資料列包含所有欄位值
- [x] 3.2 只填 slug + 售價新增商品 → 商品建立成功，name 預設為 slug
- [x] 3.3 將新商品上架（is_active = true）→ 前台商品頁正確顯示名稱與圖片
