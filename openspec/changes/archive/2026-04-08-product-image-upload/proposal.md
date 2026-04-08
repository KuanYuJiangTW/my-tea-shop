## Why

後台新增和編輯商品的圖片欄位目前只支援貼 URL，且最多只有 2 張，管理員必須先把圖片上傳到外部服務取得連結才能使用，流程繁瑣，且無法在手機上方便操作。改為直接從裝置選擇並上傳圖片，最多 5 張，能大幅降低管理門檻。

## What Changes

- 後台新增商品與編輯商品的圖片區塊，改為檔案選擇器（支援手機相簿、桌機瀏覽器）
- 選圖後立即上傳至 Supabase Storage，顯示預覽縮圖
- 最多支援 5 張圖片，可個別刪除
- Supabase `products` 資料表新增 `gallery TEXT[]` 欄位儲存圖片 URL 陣列
- 前台商品卡片與燈箱讀取 `gallery`，向下相容現有 `image_url`/`image_url2`

## Capabilities

### New Capabilities
- `product-image-upload`：管理員可從裝置上傳商品圖片至 Supabase Storage

### Modified Capabilities
- `admin-product-management`：新增與編輯商品時圖片改為上傳檔案，支援最多 5 張

## Impact

- Supabase Storage：建立 `product-images` 公開 bucket
- Supabase `products` 資料表：新增 `gallery TEXT[]` 欄位（需手動執行 migration SQL）
- `src/app/api/admin/upload-image/route.ts`：新增圖片上傳 API
- `src/app/admin/(protected)/products/ProductsClient.tsx`：圖片區塊 UI 改為上傳器
- `src/lib/products.ts`：`mapRow` 優先讀 `gallery`，fallback 到 `image_url`/`image_url2`
- `src/app/admin/(protected)/products/page.tsx`：SELECT 新增 `gallery`
- `next.config.ts`：`images.remotePatterns` 新增 Supabase Storage hostname
