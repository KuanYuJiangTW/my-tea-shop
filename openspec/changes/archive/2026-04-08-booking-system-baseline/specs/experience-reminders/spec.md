## ADDED Requirements

### Requirement: Cron Job 受 CRON_SECRET 保護
系統 SHALL 驗證 `Authorization: Bearer <CRON_SECRET>` Header，拒絕未授權呼叫。

#### Scenario: 未授權呼叫 Cron 端點
- **WHEN** 請求 `GET /api/cron/experience-reminders` 時缺少或錯誤的 `CRON_SECRET`
- **THEN** 系統回傳 HTTP 401

### Requirement: 活動前 3 天確認是否開課
系統 SHALL 在距活動 3 天當日，比較已確認報名人數與 `min_participants`。

#### Scenario: 人數達開課門檻，寄出確認通知
- **WHEN** `confirmed` 預約的 `SUM(participant_count) >= min_participants`
- **THEN** 對所有已確認預約者寄出確認開課 Email

#### Scenario: 人數未達開課門檻，自動取消場次
- **WHEN** `SUM(participant_count) < min_participants`
- **THEN** 場次狀態更新為 `cancelled`（`cancel_reason: "報名人數未達開課門檻"`），所有 `confirmed` 預約更新為 `cancelled`（`refund_status: "pending"`），寄出取消通知給所有預約者，並通知管理員

### Requirement: 活動前 1 天寄送活動提醒
系統 SHALL 對隔日場次的所有 `confirmed` 預約者寄出活動提醒 Email。

#### Scenario: 活動前一天寄出提醒
- **WHEN** 場次 `session_date = tomorrow`，且 `status != "cancelled"`
- **THEN** 每筆 `confirmed` 預約各寄一封提醒信，含體驗名稱、日期、時間、人數
