## ADDED Requirements

### Requirement: 參加者資料於活動前 5 天截止補填
建立預約時，系統 SHALL 計算 `participants_due_at = 活動日期 - 5 天`，作為補填截止時間。

#### Scenario: 建立預約時設定截止時間
- **WHEN** 預約建立成功
- **THEN** `participants_due_at` 設定為場次開始時間往前推 5 天

### Requirement: 每位參加者需填寫四項必填資料
系統 SHALL 要求每筆 `booking_participants` 記錄包含：`name`（姓名）、`id_number`（身分證號）、`date_of_birth`（出生日期）、`emergency_contact_name` 與 `emergency_contact_phone`（緊急聯絡人）。

#### Scenario: 補填完整參加者資料
- **WHEN** 使用者呼叫 `POST /api/bookings/[id]/participants`，並提供所有必填欄位
- **THEN** 系統建立 `booking_participants` 記錄，第一位設定 `is_primary = true`

### Requirement: 活動前 5 天 Cron 提醒未填寫的預約者
系統 SHALL 在距活動 5 天當日，對尚未填滿所有參加者資料的 `confirmed` 預約寄送提醒 Email。

#### Scenario: 部分填寫的預約收到提醒
- **WHEN** Cron 執行，`filled_count < participant_count`
- **THEN** 寄送提醒 Email，含補填連結 `/account/bookings/[id]/participants`

#### Scenario: 已全部填寫的預約不收提醒
- **WHEN** Cron 執行，`filled_count >= participant_count`
- **THEN** 不寄送 Email
