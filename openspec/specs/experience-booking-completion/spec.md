# experience-booking-completion Specification

## Purpose
體驗預約的完成標記：後台手動標記、逾期未處理的視覺提示、已完成篩選 tab，以及 7 天自動完成的 cron。

## Requirements

### Requirement: 後台手動標記預約完成
系統 SHALL 在活動時間已過的 `confirmed` 預約旁顯示「標記完成」按鈕，管理員點擊後立即將預約狀態改為 `completed` 並發放積點。

#### Scenario: 手動標記完成
- **WHEN** 管理員點擊活動已過的 `confirmed` 預約的「標記完成」按鈕
- **THEN** 預約狀態更新為 `completed`，積點發放至會員帳戶，按鈕消失

#### Scenario: 尚未到活動時間不顯示按鈕
- **WHEN** 預約的 `session_date + start_time > NOW()`
- **THEN** 不顯示「標記完成」按鈕（僅顯示「代為取消」）

### Requirement: 後台活動已過但未完成的預約須有視覺提示
系統 SHALL 將活動時間已過、狀態仍為 `confirmed` 的預約以黃底標示，讓管理員一眼識別待處理項目。

#### Scenario: 活動已過的 confirmed 預約
- **WHEN** 管理員查看預約名單，某筆預約 `session_date + start_time < NOW()` 且 `status = "confirmed"`
- **THEN** 該列以黃底色顯示

#### Scenario: 已完成或未來場次
- **WHEN** 預約狀態為 `completed` 或活動時間尚未到
- **THEN** 不套用黃底樣式

### Requirement: 後台新增「已完成」篩選 tab
系統 SHALL 在後台預約管理頁新增「已完成」篩選 tab，讓管理員可查看所有 `completed` 狀態的預約。

#### Scenario: 切換到已完成 tab
- **WHEN** 管理員點擊「已完成」tab
- **THEN** 僅顯示 `status = "completed"` 的預約

### Requirement: Cron Job 自動完成超過 7 天未處理的確認預約
系統 SHALL 每日執行排程任務，將活動結束超過 7 天、狀態仍為 `confirmed` 的預約自動更新為 `completed` 並發放積點。

#### Scenario: 自動完成到期預約
- **WHEN** Cron Job 執行，發現 `status = "confirmed"` 且 `session_date + start_time + 7天 < NOW()` 的預約
- **THEN** 批次更新狀態為 `completed`，對每筆有效預約插入積點記錄（防重複）

#### Scenario: 積點防重複
- **WHEN** Cron Job 嘗試對已有 `booking_id` 對應 earn 記錄的預約發放積點
- **THEN** 跳過，不重複插入

#### Scenario: Cron 安全驗證
- **WHEN** 請求 `/api/cron/complete-bookings` 缺少有效的 `Authorization: Bearer <CRON_SECRET>` header
- **THEN** 回傳 HTTP 401，不執行任何更新
