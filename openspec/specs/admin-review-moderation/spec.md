## ADDED Requirements

### Requirement: 後台可切換評論的顯示狀態（軟刪除）
系統 SHALL 提供 `PATCH /api/admin/reviews/[id]`，更新 `is_visible` 欄位，不實際刪除資料。

#### Scenario: 隱藏評論
- **WHEN** 管理員 `PATCH /api/admin/reviews/[id]` 傳入 `{ is_visible: false }`
- **THEN** `experience_reviews.is_visible` 更新為 `false`，前台不再顯示此評論

#### Scenario: 恢復顯示評論
- **WHEN** 管理員 `PATCH /api/admin/reviews/[id]` 傳入 `{ is_visible: true }`
- **THEN** `experience_reviews.is_visible` 更新為 `true`，前台重新顯示此評論

### Requirement: 前台只顯示 is_visible = true 的評論
系統 SHALL 在前台評論查詢中，過濾掉 `is_visible = false` 的評論（透過 RLS Policy 實現）。

#### Scenario: 公開讀取評論
- **WHEN** 任何訪客查詢體驗評論
- **THEN** 只回傳 `is_visible = true` 的評論
