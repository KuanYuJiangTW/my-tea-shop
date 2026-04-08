## 1. 環境設定（手動）

- [ ] 1.1 Supabase Dashboard：建立 `product-images` 公開 Storage bucket
- [ ] 1.2 Supabase SQL Editor：執行 `ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery TEXT[] DEFAULT '{}';`

## 2. 圖片上傳 API

- [x] 2.1 `src/app/api/admin/upload-image/route.ts`：建立 POST handler，接受 multipart form data（`file`、`slug`），上傳至 Supabase Storage，回傳圖片公開 URL

## 3. 前台 mapRow 更新

- [x] 3.1 `src/lib/products.ts`：`mapRow` 中 `image` 改為 `gallery[0] || image_url`，`image2` 改為 `gallery[1] || image_url2`
- [x] 3.2 `src/app/admin/(protected)/products/page.tsx`：SELECT 新增 `gallery`
- [x] 3.3 `src/app/admin/(protected)/products/ProductsClient.tsx`：`Product` type 新增 `gallery: string[]`

## 4. 圖片上傳 UI 元件

- [x] 4.1 `ProductsClient.tsx`：新增 `ImageUploader` 子元件，接受 `slug`、`gallery`、`onChange`、`uploading` props
- [x] 4.2 `ImageUploader`：顯示縮圖 grid、「選擇圖片」按鈕（已達 5 張則隱藏）、各縮圖右上角刪除按鈕
- [x] 4.3 `ImageUploader`：選檔後呼叫 `/api/admin/upload-image`，成功後呼叫 `onChange` 更新 gallery

## 5. 新增商品表單整合

- [x] 5.1 `ProductsClient.tsx`：`CreateForm` 新增 `gallery: string[]`，`EMPTY_CREATE_FORM.gallery = []`
- [x] 5.2 `ProductsClient.tsx`：新增表單圖片區塊改為 `ImageUploader`（slug 用 `createForm.slug`）
- [x] 5.3 `ProductsClient.tsx`：`createProduct()` 送出時包含 `gallery`

## 6. 編輯商品表單整合

- [x] 6.1 `ProductsClient.tsx`：`EditState` 新增 `gallery: string[]`
- [x] 6.2 `ProductsClient.tsx`：`startEdit()` 初始化 `gallery` 從 `product.gallery`
- [x] 6.3 `ProductsClient.tsx`：編輯展開圖片區塊改為 `ImageUploader`
- [x] 6.4 `ProductsClient.tsx`：`saveProduct()` 送出時包含 `gallery`

## 7. 驗收測試

- [ ] 7.1 手機：點擊「選擇圖片」→ 開啟相簿，選圖後顯示縮圖預覽
- [ ] 7.2 桌機：點擊「選擇圖片」→ 開啟檔案選擇器，選圖後顯示縮圖預覽
- [ ] 7.3 上傳 5 張後「選擇圖片」按鈕隱藏
- [ ] 7.4 點擊縮圖刪除按鈕 → 縮圖消失
- [ ] 7.5 新增商品送出 → Supabase `gallery` 欄位有圖片 URL 陣列
- [ ] 7.6 前台商品卡片正確顯示 gallery 第一張圖片
