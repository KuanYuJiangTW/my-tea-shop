## Context

現有圖片欄位 `image_url`、`image_url2` 是純文字 URL，前台的 `lib/products.ts` 將它們 map 成 `product.image` 和 `product.image2` 供 `ProductCard.tsx` 使用。需要在不破壞現有 5 種茶資料的前提下，擴充為支援最多 5 張圖片的上傳功能。

## Goals / Non-Goals

**Goals:**
- 圖片上傳至 Supabase Storage `product-images` bucket（public）
- 上傳 API 受後台 session 保護
- 支援最多 5 張，顯示縮圖預覽，可個別刪除
- `gallery TEXT[]` 欄位儲存圖片 URL 陣列
- 前台向下相容：`gallery` 有值用 gallery，否則 fallback `image_url`/`image_url2`
- 新增商品與編輯商品共用同一個圖片上傳元件

**Non-Goals:**
- 不做圖片裁切或壓縮
- 不移除舊有 `image_url`/`image_url2` 欄位（保留向下相容）
- 不支援拖拉排序（固定上傳順序即為顯示順序）

## Decisions

**上傳流程：選檔 → 立即上傳 → 取得 URL → 存入 gallery state**

每選一張圖片後立即呼叫 `POST /api/admin/upload-image`，成功後將回傳的 URL 加入本地 `gallery` 陣列。送出新增/儲存時，`gallery` 陣列一併寫入 Supabase。這樣做的好處是使用者可以即時看到預覽，且不需要複雜的 multipart 批次上傳。

**Supabase Storage 路徑：`product-images/{slug}/{timestamp}-{filename}`**

以 slug 為資料夾，避免不同商品的圖片混在一起。若刪除圖片，從 `gallery` 移除 URL 即可（Storage 的檔案保留，避免刪除邏輯複雜化）。

**`gallery TEXT[]` 欄位 Migration**

需要使用者在 Supabase 執行：
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery TEXT[] DEFAULT '{}';
```

**前台 mapRow 邏輯**

```ts
const gallery = row.gallery ?? [];
image:  gallery[0] || row.image_url || undefined,
image2: gallery[1] || row.image_url2 || undefined,
```

**next.config.ts remotePatterns**

Supabase Storage 的圖片 hostname 為 `{project-id}.supabase.co`，已在現有設定中，不需額外新增。

## Risks / Trade-offs

- [刪除圖片後 Storage 有殘留檔案] → 可接受，Supabase free tier 有 1GB 儲存，日後再清理
- [同時上傳多張若失敗] → 每張獨立上傳，失敗時顯示錯誤，不影響其他已上傳的圖片
- [手機上傳速度] → 圖片大小由瀏覽器原生控制，建議管理員上傳前先壓縮，或日後加入 client-side 壓縮
