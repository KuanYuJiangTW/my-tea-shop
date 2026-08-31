# waitlist Specification

## Purpose
候補機制：加入資格（僅額滿場次）、候補人數更新、釋出名額時的遞補通知、確認期限與名額再驗證，以及過期候補的清理 cron。

## Requirements

### Requirement: 只有額滿場次才能加入候補
系統 SHALL 拒絕對 `status != "full"` 的場次加入候補請求。

#### Scenario: 場次仍有名額時嘗試加入候補
- **WHEN** 使用者對 `status = "open"` 的場次呼叫 `POST /api/waitlist`
- **THEN** 系統回傳 HTTP 409 `{ error: "此場次仍有名額，請直接預約" }`

### Requirement: 成功加入候補後更新場次候補人數
系統 SHALL 呼叫 `increment_waitlist_count` RPC 更新 `experience_sessions.waitlist_count`。

#### Scenario: 成功加入候補
- **WHEN** 所有驗證通過，候補記錄建立成功
- **THEN** 系統回傳 `{ waitlistId }`，且場次 `waitlist_count + 1`

### Requirement: 取消預約後通知下一位符合條件的候補者
系統 SHALL 在預約取消後，找到 `status = "waiting"` 且 `participant_count <= freedSlots` 的最早候補記錄並通知。

#### Scenario: 有候補者且人數符合
- **WHEN** 預約取消釋出 N 個名額，候補名單中有 `participant_count <= N` 的記錄
- **THEN** 最早報名者狀態更新為 `notified`，設定 24 小時確認截止時間，寄出通知 Email

#### Scenario: 無符合人數的候補者
- **WHEN** 所有候補記錄的 `participant_count > freedSlots`
- **THEN** 不發出任何通知

### Requirement: 候補者須在截止時間內確認
系統 SHALL 拒絕超過 `confirm_deadline` 的確認請求。

#### Scenario: 在截止時間前確認
- **WHEN** 候補者呼叫 `POST /api/waitlist/[id]/confirm`，且當前時間 < `confirm_deadline`
- **THEN** 建立正式預約（`pending_payment`），`waitlist_entries.status` 更新為 `confirmed`，`waitlist_count - 1`

#### Scenario: 超過截止時間確認
- **WHEN** `confirm_deadline` 已過
- **THEN** 系統回傳 HTTP 409 `{ error: "確認時間已過期，名額已釋出" }`

### Requirement: 確認時再次驗證名額
系統 SHALL 在候補確認時，重新確認場次仍有足夠名額。

#### Scenario: 確認時名額已被搶走
- **WHEN** 候補確認時場次剩餘名額 < `participant_count`
- **THEN** 候補狀態更新為 `expired`，通知下一位候補者，回傳 HTTP 409

### Requirement: Cron 清理過期候補並通知下一位
系統 SHALL 每日執行 `expireWaitlistAndNotifyNext()`，將已超過 `confirm_deadline` 的 `notified` 記錄標為 `expired`，並觸發下一位通知。

#### Scenario: 候補者未在期限內確認
- **WHEN** Cron 執行時發現 `status = "notified"` 且 `confirm_deadline < now()`
- **THEN** 記錄標為 `expired`，通知下一位 `waiting` 候補者
