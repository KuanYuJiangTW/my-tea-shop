## ADDED Requirements

### Requirement: 後台管理頁面在手機上不水平溢出
系統 SHALL 在後台所有含表格的頁面，將表格包裝於 `overflow-x-auto` 容器內，確保手機可水平滑動閱讀。

#### Scenario: 手機瀏覽預約列表
- **WHEN** 使用者在 375px 寬度裝置上瀏覽 `/admin/experiences/bookings`
- **THEN** 頁面不出現整頁水平捲軸，表格可在容器內水平滑動

#### Scenario: 手機瀏覽場次管理
- **WHEN** 使用者在 375px 寬度裝置上瀏覽 `/admin/experiences/sessions`
- **THEN** 頁面不出現整頁水平捲軸，表格可在容器內水平滑動

### Requirement: 後台篩選與搜尋控件在手機上正常顯示
系統 SHALL 確保後台搜尋輸入框寬度不超出螢幕，篩選按鈕在小螢幕自動換行。

#### Scenario: 手機上搜尋框不溢出
- **WHEN** 使用者在 375px 寬度裝置上瀏覽後台預約管理
- **THEN** 搜尋輸入框寬度不超出頁面邊界

### Requirement: 前台相簿在手機上顯示 2 欄縮圖
系統 SHALL 在手機（< 640px）上將體驗相簿縮圖格線設為 2 欄，sm: 以上設為 3 欄。

#### Scenario: 手機查看相簿
- **WHEN** 使用者在 375px 裝置上瀏覽體驗詳細頁相簿
- **THEN** 縮圖顯示為 2 欄格線，圖片大小適合觀看

### Requirement: 預約流程摘要區塊在手機上單欄顯示
系統 SHALL 在預約確認頁面，場次摘要（日期、時間、名額）在手機上以單欄顯示，md: 以上才改為 3 欄。

#### Scenario: 手機查看預約摘要
- **WHEN** 使用者在 375px 裝置上瀏覽預約確認頁
- **THEN** 日期、時間、名額各自佔一行，不被壓縮
