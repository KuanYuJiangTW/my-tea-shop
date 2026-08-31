# admin-review-moderation Specification

## Purpose
後台以軟刪除切換評論的顯示狀態，前台只顯示 `is_visible` 為真的評論。不實際刪資料，誤判時才能復原。
## Requirements
### Requirement: 後台可切換評論的顯示狀態（軟刪除）
系統 SHALL 提供 `PATCH /api/admin/reviews/[id]`，更新 `is_visible` 欄位，不實際刪除資料。該路由 SHALL 接受 query 參數 `type`（`experience` | `product`）決定目標資料表，未帶 `type` 時 SHALL 預設為 `experience` 以維持既有呼叫端不變。

#### Scenario: 隱藏體驗評論
- **WHEN** 管理員 `PATCH /api/admin/reviews/[id]` 傳入 `{ is_visible: false }`（未帶 `type`）
- **THEN** `experience_reviews.is_visible` 更新為 `false`，前台不再顯示此評論

#### Scenario: 恢復顯示體驗評論
- **WHEN** 管理員 `PATCH /api/admin/reviews/[id]` 傳入 `{ is_visible: true }`（未帶 `type`）
- **THEN** `experience_reviews.is_visible` 更新為 `true`，前台重新顯示此評論

#### Scenario: 隱藏商品評論
- **WHEN** 管理員 `PATCH /api/admin/reviews/[id]?type=product` 傳入 `{ is_visible: false }`
- **THEN** `product_reviews.is_visible` 更新為 `false`，前台不再顯示此評論

#### Scenario: 不合法的 type
- **WHEN** `type` 不是 `experience` 也不是 `product`
- **THEN** 系統回傳 HTTP 400 `{ error: "參數錯誤" }`

### Requirement: 前台只顯示 is_visible = true 的評論
系統 SHALL 在前台評論查詢中，過濾掉 `is_visible = false` 的評論（透過 RLS Policy 實現）。此規則 SHALL 同時適用於 `experience_reviews` 與 `product_reviews`。

#### Scenario: 公開讀取體驗評論
- **WHEN** 任何訪客查詢體驗評論
- **THEN** 只回傳 `is_visible = true` 的評論

#### Scenario: 公開讀取商品評論
- **WHEN** 任何訪客查詢商品評論
- **THEN** 只回傳 `is_visible = true` 的評論

