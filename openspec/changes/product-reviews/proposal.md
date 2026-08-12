# 提案：商品評價

## Why

茶葉是「不能試喝就得先付 400 元」的品類，社會證明的轉換權重高於任何視覺優化。體驗端已有完整的評價機制（`user-reviews`、`admin-review-moderation`），**商品端是零**——五款茶沒有任何一則評價。

現在做的第二個理由是時機：真實已付款訂單只有 6 筆、3 個客人（2026-08-12 盤點），等自然評價累積要很久，但業主手上已經有 LINE 與 FB 的既有好評。**先讓那些口碑上得了架**，比等一套完整的投稿系統實際。

第三個理由是相依：`product-detail-pages` 提案要輸出 Product JSON-LD 的 `aggregateRating`，沒有商品評價就沒有那個欄位。

## What Changes

本提案分兩階段，**階段一可獨立上線**，業主可只做階段一。

### 階段一：唯讀展示（`product-reviews-display`）

- 新增 `product_reviews` 資料表，欄位與 `experience_reviews` 對齊（含 `is_visible` 軟刪除）
- 後台新增「商品評價」管理頁：**手動新增**既有口碑（來源、顯示名稱、星等、內容、日期），以及切換顯示狀態
- 前台商品卡與 `/products` 顯示星等彙總（平均 ★ ＋ 則數）
- 手動新增的評價一律標記 `source`，前台顯示「來自 LINE／FB 的顧客回饋」而非偽裝成站內投稿

### 階段二：使用者投稿（`product-reviews-submission`）

- 已購驗證：只有 `order_status = completed` 且該訂單含此商品的使用者可留評
- 每筆訂單每個商品限一則（DB UNIQUE constraint）
- 會員中心的訂單列表顯示「留評／已評價」
- 商品 JSON-LD 輸出 `aggregateRating`（沿用體驗頁 `ratings.length >= 3` 的門檻）

**BREAKING**：無。兩階段都是新增。

## Capabilities

### New Capabilities

- `product-reviews-display`：商品評價的資料模型、後台建檔與顯示狀態切換、前台星等彙總與列表顯示。**不含使用者投稿。**
- `product-reviews-submission`：已購驗證、留評 API、每訂單每商品限一則、會員中心留評入口、`aggregateRating` 輸出。

### Modified Capabilities

- `admin-review-moderation`：現行規格只描述 `experience_reviews` 的 `is_visible` 切換與 `PATCH /api/admin/reviews/[id]`。要求擴充為「評價審核適用於體驗與商品兩種來源」，路由需能辨別目標資料表。

## Impact

**資料庫**
- 新表 `product_reviews`（`supabase/add_product_reviews.sql`，需手動執行）
- RLS：公開讀取只回傳 `is_visible = true`，比照 `experience_reviews`

**程式碼**
- 新增：後台商品評價頁、前台商品評價元件（比照 `src/app/experiences/[slug]/ExperienceReviews.tsx`）
- 修改：`src/app/api/admin/reviews/[id]/route.ts`（要能處理兩種來源）、`ProductCard.tsx`（星等彙總）
- 階段二另增 `POST /api/product-reviews` 與會員中心訂單列表

**相依**
- `product-detail-pages`（尚未實作）：該提案的 `aggregateRating` 需要本提案階段二
- 商品 `slug` 已於 2026-08-12 補齊，不是阻礙

**風險**
- 商品卡是固定高度 632px（業主指定值），加星等列會影響總高——需在既有間距內吸收，或明確取得業主同意調整
- 手動建檔的評價若不標示來源，等於偽造站內評價；本提案把 `source` 列為必填以避免這件事
