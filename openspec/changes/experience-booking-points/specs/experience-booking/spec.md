## ADDED Requirements

### Requirement: 建立預約時接受 pointsToUse 參數
系統 SHALL 在 `POST /api/bookings` 接受可選的 `pointsToUse` 參數，並將其暫存於 booking 記錄，實際扣點在 experience-checkout 時執行。

#### Scenario: 傳入 pointsToUse 建立預約
- **WHEN** 使用者呼叫 `POST /api/bookings` 並傳入 `pointsToUse: 200`
- **THEN** 預約建立成功，回傳資訊中包含 `pointsToUse` 供後續結帳使用

#### Scenario: 未傳入 pointsToUse
- **WHEN** 使用者呼叫 `POST /api/bookings` 未傳入 `pointsToUse`
- **THEN** 預約建立成功，`pointsToUse` 預設為 0
