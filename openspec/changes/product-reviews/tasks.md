# 任務：商品評價

> 階段一（1–5 章）可獨立上線。階段二（6–8 章）等業主看過階段一效果再決定。
> 開工前先讀 `openspec/specs/user-reviews/` 與 `openspec/specs/admin-review-moderation/`——本提案是把那套搬到商品端，不是重寫。

## 1. 資料層

- [ ] 1.1 寫 `supabase/add_product_reviews.sql`：建表（`product_id` FK、`rating` 1–5 CHECK、`comment`、`source` enum、`display_name`、`source_note`、`reviewed_at`、`is_visible` 預設 true、`order_id`／`user_id` 可空、`created_at`）
- [ ] 1.2 同檔加 RLS：公開讀取只回 `is_visible = true`，比照 `experience_reviews` 的 policy 寫法
- [ ] 1.3 同檔加 UNIQUE `(order_id, product_id)`（階段二才會用到，先建好避免二次 migration）與查詢索引 `(product_id, is_visible)`
- [ ] 1.4 業主在 Supabase 執行該 SQL，並回報成功（DDL 無法由程式碼執行）

## 2. 後台建檔

- [ ] 2.1 新增後台「商品評價」頁：列出既有評價（商品、星等、來源、顯示名稱、日期、顯示狀態）
- [ ] 2.2 新增表單：商品下拉、星等、內容、顯示名稱、來源、原始出處備註、評價日期
- [ ] 2.3 `POST /api/admin/product-reviews`：驗證 `rating` 1–5、`source` 必填且為合法 enum，缺 `source` 回 400
- [ ] 2.4 改 `PATCH /api/admin/reviews/[id]`：接受 `?type=product|experience`，未帶預設 `experience`，不合法的 `type` 回 400
- [ ] 2.5 確認既有的體驗評價後台頁未受影響（沒帶 `type` 仍走原路徑）

## 3. 前台顯示

- [ ] 3.1 新增商品評價元件（比照 `src/app/experiences/[slug]/ExperienceReviews.tsx` 的 Stars 與版面）
- [ ] 3.2 實作門檻邏輯：可見評價 ≥ 3 才顯示平均星等；1–2 則只顯示列表；0 則整區不顯示（不出現「暫無評價」）
- [ ] 3.3 非 `site` 來源的評價顯示來源標註，`site` 不顯示
- [ ] 3.4 中英文案進 `messages/zh.json` 與 `en.json`（來源標註、則數、平均）

## 4. 商品卡星等（高度敏感）

- [ ] 4.1 **先量測**：把星等列加進 `ProductCard.tsx` 後，在 1280／768／375 三個斷點量所有卡片高度取 Set
- [ ] 4.2 若總高仍為 632px → 保留星等列；若不是 → 依 design.md D4 退回「商品卡不顯示、只在列表頁呈現」，並在 PR 說明為什麼
- [ ] 4.3 確認 `/products` 五張卡在同一斷點內等高

## 5. 階段一驗收

- [ ] 5.1 `/verify` 三項全過
- [ ] 5.2 瀏覽器實測：0 則／1 則／3 則三種狀態的顯示都正確（可用後台建檔造資料）
- [ ] 5.3 實測隱藏一則後前台立即不顯示
- [ ] 5.4 英文版 `/en` 無中文殘留
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
