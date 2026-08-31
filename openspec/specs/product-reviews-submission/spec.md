# product-reviews-submission Specification

## Purpose
TBD - created by archiving change product-reviews. Update Purpose after archive.
## Requirements
### Requirement: 只有實際買過該商品的使用者可以留評
系統 SHALL 在 `POST /api/product-reviews` 驗證：訂單屬於本人、`order_status = "completed"`、且該訂單的 `items` 含有此 `product_id`。

#### Scenario: 訂單不屬於本人
- **WHEN** `order.user_id !== 登入者`
- **THEN** 系統回傳 HTTP 403 `{ error: "無權限" }`

#### Scenario: 訂單尚未完成
- **WHEN** `order_status !== "completed"`
- **THEN** 系統回傳 HTTP 409 `{ error: "訂單尚未完成，無法留評" }`

#### Scenario: 訂單不含此商品
- **WHEN** 訂單的 `items` 展開後找不到該 `product_id`
- **THEN** 系統回傳 HTTP 409 `{ error: "這筆訂單沒有這項商品" }`

### Requirement: 每筆訂單的每項商品限留一則評價
系統 SHALL 透過資料庫 UNIQUE constraint（`order_id`, `product_id`）防止重複留評。

#### Scenario: 重複留評
- **WHEN** 同一組 `(order_id, product_id)` 已有評價
- **THEN** 系統回傳 HTTP 409 `{ error: "您已經評價過這項商品" }`（PG 錯誤碼 23505）

#### Scenario: 同商品但不同訂單
- **WHEN** 使用者在另一筆訂單再次購買同商品並留評
- **THEN** 允許寫入

### Requirement: 站內投稿的評價來源固定為 site
系統 SHALL 將 `POST /api/product-reviews` 寫入的評價 `source` 設為 `site`，且 SHALL 忽略請求中傳入的 `source`。

#### Scenario: 請求嘗試偽造來源
- **WHEN** 請求 body 帶 `source = "line"`
- **THEN** 寫入的記錄仍為 `source = "site"`

### Requirement: 評分為 1-5 星，留言為選填
系統 SHALL 要求 `rating` 為 1–5 的整數，`comment` 為選填文字。

#### Scenario: 評分超出範圍
- **WHEN** `rating < 1` 或 `rating > 5` 或非整數
- **THEN** 系統回傳 HTTP 400 `{ error: "參數錯誤" }`

#### Scenario: 只給星等不留言
- **WHEN** `rating` 合法且 `comment` 為空
- **THEN** 允許寫入

### Requirement: 會員中心的訂單顯示留評入口與已評價狀態
系統 SHALL 在會員中心的訂單商品列標記 `has_review`，據以顯示「留評」或「已評價」。

#### Scenario: 可留評
- **WHEN** 訂單 `completed`、該商品尚未評價
- **THEN** 顯示「留評」按鈕

#### Scenario: 已留評
- **WHEN** 該 `(order_id, product_id)` 已有評價
- **THEN** 顯示「已評價」，不顯示留評按鈕

### Requirement: 商品 JSON-LD 在評價數達門檻時輸出 aggregateRating
系統 SHALL 在商品的 Product JSON-LD 於可見評價數 ≥ 3 時輸出 `aggregateRating`，門檻與體驗頁一致。

#### Scenario: 評價數達門檻
- **WHEN** 某商品有 3 則以上 `is_visible = true` 的評價
- **THEN** Product JSON-LD 含 `aggregateRating`（`ratingValue` 為平均、`reviewCount` 為則數）

#### Scenario: 評價數不足
- **WHEN** 可見評價數 < 3
- **THEN** Product JSON-LD 不含 `aggregateRating` 欄位

