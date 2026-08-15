# 任務：商品評價

> 階段一（1–5 章）可獨立上線。階段二（6–8 章）等業主看過階段一效果再決定。
> 開工前先讀 `openspec/specs/user-reviews/` 與 `openspec/specs/admin-review-moderation/`——本提案是把那套搬到商品端，不是重寫。

## 1. 資料層

- [x] 1.1 寫 `supabase/add_product_reviews.sql`：建表（`product_id` FK、`rating` 1–5 CHECK、`comment`、`source` enum、`display_name`、`source_note`、`reviewed_at`、`is_visible` 預設 true、`order_id`／`user_id` 可空、`created_at`）
- [x] 1.2 同檔加 RLS：公開讀取只回 `is_visible = true`，比照 `experience_reviews` 的 policy 寫法
- [x] 1.3 同檔加 UNIQUE `(order_id, product_id)`（階段二才會用到，先建好避免二次 migration）與查詢索引 `(product_id, is_visible)`
      ＊UNIQUE 用 partial index（`where order_id is not null`），手動建檔的 NULL 不受約束
- [ ] 1.4 業主在 Supabase 執行該 SQL，並回報成功（DDL 無法由程式碼執行）
      **← 卡在這裡，其餘階段一的程式碼都已就緒**

## 2. 後台建檔

- [x] 2.1 新增後台「商品評價」頁：列出既有評價（商品、星等、來源、顯示名稱、日期、顯示狀態）
      `src/app/admin/(protected)/product-reviews/`，側欄「商品」群組下新增入口。
      資料表未建立時給明確指引（要執行哪支 SQL），不丟 PostgREST 錯誤碼
- [x] 2.2 新增表單：商品下拉、星等、內容、顯示名稱、來源、原始出處備註、評價日期
- [x] 2.3 `POST /api/admin/product-reviews`：驗證 `rating` 1–5、`source` 必填且為合法 enum，缺 `source` 回 400
- [x] 2.4 改 `PATCH /api/admin/reviews/[id]`：接受 `?type=product|experience`，未帶預設 `experience`，不合法的 `type` 回 400
- [x] 2.5 確認既有的體驗評價後台頁未受影響（沒帶 `type` 仍走原路徑）
      證據：`src/__tests__/products/product-reviews.test.ts`「沒帶 type 時維持既有行為」；
      `AdminReviewsClient.tsx` 未改動

## 3. 前台顯示

- [x] 3.1 新增商品評價元件（比照 `src/app/experiences/[slug]/ExperienceReviews.tsx` 的 Stars 與版面）
      `src/components/ProductReviews.tsx`。**商品詳情頁還不存在**，所以階段一掛在
      `/products` 底部的「顧客回饋」區，一款茶一個區塊；`product-detail-pages` 做好後搬過去
- [x] 3.2 實作門檻邏輯：可見評價 ≥ 3 才顯示平均星等；1–2 則只顯示列表；0 則整區不顯示（不出現「暫無評價」）
      門檻常數在 `src/lib/product-review-core.ts`（`MIN_REVIEWS_FOR_AVERAGE = 3`），有單元測試
- [x] 3.3 非 `site` 來源的評價顯示來源標註，`site` 不顯示
- [x] 3.4 中英文案進 `messages/zh.json` 與 `en.json`（來源標註、則數、平均）
      英文則數用 ICU plural，1 則顯示 `(1 review)` 而不是 `(1 reviews)`

## 4. 商品卡星等（高度敏感）

- [x] 4.1 **先量測**：把星等列加進 `ProductCard.tsx` 後，在 1280／768／375 三個斷點量所有卡片高度取 Set
      實測（2026-08-15，dev server ＋ 五張卡）：
      | 斷點 | 有星等列 | 無星等列 |
      |---|---|---|
      | 1280 | `{664}` | `{632}` |
      | 768 | `{664}` | `{632}` |
      | 375 | `{664}` | `{632}` |
      星等列本身 24px ＋ `mb-2` 8px＝**固定多 32px**，三個斷點一致
- [x] 4.2 若總高仍為 632px → 保留星等列；若不是 → 依 design.md D4 退回「商品卡不顯示、只在列表頁呈現」，並在 PR 說明為什麼
      **走 D4 退路：商品卡不顯示星等。** 632 是業主指定值，而卡內 6 處間距早在
      2026-08-12 為了描述第三行各縮過 2–4px，最多再擠出 22px，補不回 32px；
      硬擠會動到已拍板的排版。星等與平均改在 `/products` 的顧客回饋區呈現。
      理由已寫進 `ProductCard.tsx` 描述段上方的註解，避免下一個 session 再試一次
- [x] 4.3 確認 `/products` 五張卡在同一斷點內等高
      三個斷點的高度 Set 都只有一個值（見 4.1 表格）

## 5. 階段一驗收

- [x] 5.1 `/verify` 三項全過
      2026-08-15：測試 635 passed（50 檔）、`tsc --noEmit` 無輸出、`npm run lint` 0 error
      （36 warning 全是既有檔案）、`npm run build` 成功
- [x] 5.2 瀏覽器實測：0 則／1 則／3 則三種狀態的顯示都正確（可用後台建檔造資料）
      **注意：資料是暫時塞在讀取層的假資料**（量高度時一併驗的，量完已移除），不是走後台建檔。
      實測結果：3 則的阿里山高山烏龍顯示「5.0（3 則）」；1 則的蜜香紅茶只顯示「（1 則）」
      無平均；其餘三款 0 則完全不出現。**待業主執行 SQL 後要用真資料重跑一次**
- [ ] 5.3 實測隱藏一則後前台立即不顯示
      程式面已接：`PATCH ?type=product` 會 `revalidatePath("/products")`，但**尚未對真資料庫實測**（等 1.4）
- [x] 5.4 英文版 `/en` 無中文殘留
      `/en/products` 的顧客回饋區介面字串全英文（`Customer Reviews`／`Shared via LINE`／
      `(1 review)`／`(3 reviews)`）；評價原文與顧客稱呼維持中文是刻意的——原話不改寫
- [ ] 5.5 業主輸入既有口碑，回報實際則數（若不足 3 則，平均星等與 `aggregateRating` 都不會顯示）

## 6. 階段二：留評 API

- [ ] 6.1 `POST /api/product-reviews`：驗證訂單屬本人（403）、`order_status = completed`（409）、訂單 `items` 含此商品（409）
- [ ] 6.2 `source` 一律寫入 `site`，忽略請求帶入的值
- [ ] 6.3 重複留評由 UNIQUE constraint 擋下，捕捉 PG 23505 回 409
- [ ] 6.4 單元測試涵蓋上述四種錯誤路徑 ＋ 成功路徑；`items` 是 JSONB，測試要用真實形狀的資料

## 7. 階段二：會員中心與 JSON-LD

- [ ] 7.1 會員中心訂單商品列標記 `has_review`，顯示「留評」或「已評價」
- [ ] 7.2 留評表單（星等必填、留言選填）
- [ ] 7.3 商品 Product JSON-LD 在可見評價 ≥ 3 時輸出 `aggregateRating`，沿用 `experiences/[slug]/page.tsx:57-64` 的判斷寫法

## 8. 階段二驗收

- [ ] 8.1 `/verify` 三項全過
- [ ] 8.2 反向驗證：拿掉「訂單含此商品」的驗證，確認測試會紅（這條是防止亂留評的關鍵）
- [ ] 8.3 實測 JSON-LD：2 則時無 `aggregateRating`、3 則時有
