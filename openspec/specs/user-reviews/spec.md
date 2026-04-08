## ADDED Requirements

### Requirement: 只有已確認且體驗已結束的預約可以留評
系統 SHALL 在 `POST /api/reviews` 驗證：預約屬於本人、`status = "confirmed"`、`session_date < today`。

#### Scenario: 體驗尚未結束
- **WHEN** `session_date >= today`
- **THEN** 系統回傳 HTTP 409 `{ error: "體驗尚未結束，無法留評" }`

#### Scenario: 預約未確認（cancelled / pending_payment）
- **WHEN** `booking.status !== "confirmed"`
- **THEN** 系統回傳 HTTP 409 `{ error: "只有已確認的預約可以留評" }`

### Requirement: 每筆預約限留一則評論
系統 SHALL 透過資料庫 UNIQUE constraint（`booking_id`）防止重複留評。

#### Scenario: 重複留評
- **WHEN** 同一個 `booking_id` 已有評論記錄
- **THEN** 系統回傳 HTTP 409 `{ error: "您已經評價過這筆預約" }`（PG 錯誤碼 23505）

### Requirement: 評論評分為 1-5 星，留言為選填
系統 SHALL 要求 `rating` 為 1–5 的整數，`comment` 為選填文字。

#### Scenario: 評分超出範圍
- **WHEN** `rating < 1` 或 `rating > 5` 或非數字
- **THEN** 系統回傳 HTTP 400 `{ error: "參數錯誤" }`

#### Scenario: 成功送出評論
- **WHEN** 所有驗證通過
- **THEN** 插入 `experience_reviews` 記錄（含 `experience_type_id`），回傳 `{ id }`

### Requirement: 帳號頁顯示是否可留評，並標記已留評
系統 SHALL 在預約列表中，標記每筆預約的 `has_review`（是否已留評），讓使用者知道是否仍可留評。

#### Scenario: 預約尚未留評且已結束
- **WHEN** `confirmed` 狀態、`session_date < today`、`has_review = false`
- **THEN** 顯示「留評」按鈕

#### Scenario: 預約已留評
- **WHEN** `has_review = true`
- **THEN** 顯示「已評價」，不顯示留評按鈕
