## ADDED Requirements

### Requirement: 今日體驗預約數統計卡片
儀表板 SHALL 顯示「今日體驗預約」統計卡片，數值為當日 `experience_bookings` 中 `status = 'confirmed'` 的筆數。

#### Scenario: 今日有預約時顯示正確數字
- **WHEN** 當日有 3 筆已確認體驗預約
- **THEN** 「今日體驗預約」卡片顯示「3 筆」

#### Scenario: 今日無預約時顯示 0
- **WHEN** 當日沒有任何已確認體驗預約
- **THEN** 「今日體驗預約」卡片顯示「0 筆」

### Requirement: 本月體驗營收統計卡片
儀表板 SHALL 顯示「本月體驗營收」統計卡片，數值為當月 `experience_bookings` 中 `status = 'confirmed'` 的 `total_price` 加總，透過 session 的 `session_date` 篩選月份。

#### Scenario: 本月有已確認體驗預約時顯示正確金額
- **WHEN** 本月有 2 筆已確認預約，金額分別為 NT$1,800 和 NT$900
- **THEN** 「本月體驗營收」卡片顯示「NT$2,700」

### Requirement: 最近體驗預約列表
儀表板 SHALL 在統計卡片與圖表下方，顯示最新 5 筆體驗預約記錄（依建立時間降序），每筆顯示：預約者姓名、體驗類型、場次日期、人數、金額、預約狀態，並可點擊連結至後台預約詳情。

#### Scenario: 有體驗預約時顯示列表
- **WHEN** 資料庫中存在體驗預約記錄
- **THEN** 儀表板顯示最多 5 筆最新預約，每筆含姓名、體驗名稱、日期、人數、金額

#### Scenario: 無體驗預約時顯示提示文字
- **WHEN** 資料庫中沒有任何體驗預約
- **THEN** 最近體驗預約區塊顯示「目前尚無預約」
