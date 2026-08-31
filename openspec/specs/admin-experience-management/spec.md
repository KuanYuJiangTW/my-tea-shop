# admin-experience-management Specification

## Purpose
後台對體驗預約與場次的管理：查詢與搜尋、代為取消（含依距離活動時間的退款計算）、以及預約資料的 CSV 匯出。

## Requirements

### Requirement: 後台代為取消預約（含退款計算）
管理員 SHALL 能夠代替用戶取消預約，系統依相同退款規則計算退款金額。

#### Scenario: 管理員代為取消 confirmed 預約
- **WHEN** 管理員呼叫 `POST /api/admin/experience-bookings/[id]/cancel`
- **THEN** 預約狀態更新為 `cancelled`，依退款規則設定 `refund_amount`，寄送取消通知給預約者

#### Scenario: 管理員代為取消 pending_payment 預約
- **WHEN** 預約狀態為 `pending_payment`
- **THEN** 取消成功，`refund_amount = 0`，不通知候補

### Requirement: 後台可查詢與搜尋體驗預約
管理員 SHALL 能夠依體驗類型、場次日期、預約狀態、訂購人姓名等條件搜尋預約。

#### Scenario: 依條件搜尋預約
- **WHEN** 管理員在後台輸入搜尋條件
- **THEN** 回傳符合條件的預約列表

### Requirement: 後台可匯出預約 CSV
管理員 SHALL 能夠將預約列表匯出為 CSV 檔案。

#### Scenario: 匯出 CSV
- **WHEN** 管理員點選匯出按鈕
- **THEN** 瀏覽器下載包含所有查詢結果的 CSV 檔案

### Requirement: 後台可管理體驗場次
管理員 SHALL 能夠新增、查詢、更新體驗場次，包含手動取消場次。

#### Scenario: 建立新場次
- **WHEN** 管理員呼叫 `POST /api/admin/experience-sessions`
- **THEN** 新場次建立，狀態預設為 `open`

#### Scenario: 取消場次
- **WHEN** 管理員更新場次 `status = "cancelled"`
- **THEN** 場次標記為已取消，管理員需自行處理後續退款通知
