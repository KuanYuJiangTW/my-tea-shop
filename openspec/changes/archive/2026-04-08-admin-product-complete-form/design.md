## Context

前台完全依賴 Supabase 的 `products` 資料表，包含商品名稱、圖片、產地、描述等所有欄位。Sanity Studio 雖已設置，但前台未串接，目前是孤立系統。後台新增商品表單（`ProductsClient.tsx`）只開放 slug 和售價兩個欄位，其餘欄位（`name`、`image_url` 等）必須直接操作資料庫才能填寫，管理員無法獨立完成新商品上架。

## Goals / Non-Goals

**Goals:**
- 後台新增商品表單涵蓋前台顯示所需的所有欄位
- `POST /api/admin/products` 寫入所有新增欄位
- 管理員可一次完成新商品建立，無需操作資料庫或 Sanity

**Non-Goals:**
- 不修改前台商品頁面邏輯
- 不串接 Sanity Studio
- 不新增圖片上傳功能（填寫圖片 URL 即可）
- 不修改編輯表單（僅擴充新增表單）

## Decisions

**決策：維持 Supabase 作為唯一資料來源**

前台已穩定使用 Supabase，改動 Sanity 串接需修改大量前台查詢邏輯且風險高。直接擴充後台表單寫入 Supabase 欄位是最小風險路徑，且 `products` 資料表已有所有需要的欄位，無需 migration。

**決策：圖片以 URL 欄位輸入（非上傳）**

新增圖片上傳需要 Storage bucket 權限設定與額外 API，超出本次範圍。填寫圖片 URL 可滿足需求，Supabase Storage 或任何公開圖床皆可使用。

**決策：表單分區塊呈現**

新增欄位較多，分為「基本資料」（slug、名稱、分類等）、「圖片」（image_url、image_url2）、「售價與庫存」三個區塊，降低視覺複雜度。

## Risks / Trade-offs

- [圖片 URL 無法驗證有效性] → 欄位填寫錯誤時前台顯示破圖，管理員須自行確認 URL 可存取
- [表單欄位增多] → 版面較長，透過分區塊和選填標示降低認知負擔
