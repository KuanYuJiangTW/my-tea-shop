## ADDED Requirements

### Requirement: 前台會員中心顯示「已完成」預約狀態
系統 SHALL 在前台會員中心的預約列表中正確顯示 `completed` 狀態，以「已完成」標籤呈現，樣式有別於其他狀態。

#### Scenario: 顯示已完成預約
- **WHEN** 使用者查看帳戶頁面，有一筆預約狀態為 `completed`
- **THEN** 該預約顯示「已完成」綠色標籤，不顯示取消按鈕與補填資料按鈕

#### Scenario: 已完成預約顯示正確金額
- **WHEN** 預約狀態為 `completed` 且 `points_discount > 0`
- **THEN** 顯示金額為 `total_price - points_discount`

#### Scenario: 已完成預約可留下評價
- **WHEN** 預約狀態為 `completed` 且使用者尚未評價
- **THEN** 顯示「評價體驗」按鈕（沿用現有 `isPast && !has_review` 邏輯，`completed` 視為 past）
