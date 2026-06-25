## ADDED Requirements

### Requirement: Participant count input validation

建立體驗預約時，系統 SHALL 驗證 `participantCount` 為正整數且不超過合理上限（50），避免非整數或負數繞過名額檢查並產生負數金額。

#### Scenario: 非正整數人數

- **WHEN** 預約請求的 `participantCount` 非整數、小於 1、或大於 50
- **THEN** 系統 SHALL 回應 HTTP 400「參加人數不正確」，且不建立預約

#### Scenario: 合法人數

- **WHEN** `participantCount` 為 1 至 50 之間的整數，且未超過該場次剩餘名額
- **THEN** 系統 SHALL 以 `單價 × 人數` 計算金額並建立預約
