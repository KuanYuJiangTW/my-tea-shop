## ADDED Requirements

### Requirement: 後台提供開課請求管理入口
後台側邊欄的體驗管理區 SHALL 新增「開課請求」項目，連向請求管理頁；當存在 `status = "pending"` 的請求時，SHALL 顯示待審筆數標記。

#### Scenario: 有待審請求
- **WHEN** 管理員登入後台且存在 5 筆待審請求
- **THEN** 側邊欄「開課請求」旁顯示數字 5

#### Scenario: 無待審請求
- **WHEN** 沒有任何待審請求
- **THEN** 側邊欄顯示「開課請求」但不顯示數字標記

### Requirement: 後台可維護公休與黑名單日期
管理員 SHALL 能夠新增、查詢與刪除 `experience_blackout_dates` 記錄（日期與原因）。新增時若該日期已有既有場次，系統 SHALL 提示但不阻擋，且黑名單 MUST NOT 影響已建立的場次與預約。

#### Scenario: 新增公休日
- **WHEN** 管理員新增 2026-10-10 為公休日
- **THEN** 記錄建立成功，該日期在前台申請表單不可選

#### Scenario: 該日已有場次
- **WHEN** 管理員將已有場次的日期設為公休
- **THEN** 系統顯示「該日已有場次」提示，仍允許儲存，既有場次與預約不受影響

### Requirement: 後台可設定各體驗的開課請求參數
管理員 SHALL 能夠逐一設定每個體驗的 `accepts_requests`、`request_min_slots`、`request_lead_days`、`request_start_times`。`accepts_requests` 預設為 `false`。`request_min_slots` 大於 `max_participants` 時 SHALL 顯示警告。

#### Scenario: 開啟單一體驗的請求功能
- **WHEN** 管理員將茶藝體驗的 `accepts_requests` 設為 `true`
- **THEN** 只有茶藝體驗的詳細頁出現開課請求入口，其他體驗不受影響

#### Scenario: 調整最低消費
- **WHEN** 管理員將某體驗的 `request_min_slots` 由 2 改為 3
- **THEN** 前台入口顯示的名額數與金額同步更新，後端驗證採用新值

#### Scenario: 設定專屬時段
- **WHEN** 管理員將黃頭鷺導覽的 `request_start_times` 設為黃昏時段
- **THEN** 該體驗的申請表單只顯示該時段，其他體驗維持原設定

### Requirement: 後台可維護各體驗的可申請期間
管理員 SHALL 能夠為每個體驗新增、編輯與刪除可申請期間（起訖日期與說明），一款體驗可有多段。有設定期間的體驗 SHALL 只在期間內開放申請；未設定者不受季節限制。當某體驗所有期間的結束日距今不到 30 天時，後台請求管理頁 SHALL 顯示續填提醒。

#### Scenario: 設定採茶的可採期
- **WHEN** 管理員為採茶新增 4/15–5/10 與 10/1–10/25 兩段可申請期間
- **THEN** 採茶只在這兩段期間內可申請，其餘日期在前台不可選並顯示最近的可採期

#### Scenario: 期間即將用盡
- **WHEN** 某體驗最後一段可申請期間的結束日距今 20 天
- **THEN** 後台請求管理頁顯示該體驗的續填提醒

#### Scenario: 刪除全部期間
- **WHEN** 管理員刪除某體驗的所有可申請期間
- **THEN** 該體驗回到不受季節限制的狀態，僅套用前置天數、時段白名單與公休日
