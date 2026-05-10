## ADDED Requirements

### Requirement: 體驗預約前台文案支援雙語
系統 SHALL 將體驗預約流程中所有前台顯示文案（表單標籤、按鈕、狀態標籤、錯誤訊息）納入 i18n 翻譯，支援中英文切換。

#### Scenario: 英文環境下的預約表單
- **WHEN** 使用者在 `/en/experiences` 頁面瀏覽體驗並點擊預約
- **THEN** 預約表單的所有標籤（姓名、電話、人數等）以英文顯示

#### Scenario: 帳戶頁預約狀態標籤雙語
- **WHEN** 英文環境下的使用者查看帳戶頁的預約列表
- **THEN** 狀態標籤（Pending Payment、Confirmed、Completed、Cancelled）以英文顯示
