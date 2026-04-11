## ADDED Requirements

### Requirement: 公開讀取 API 速率限制
系統 SHALL 對 `GET /api/experiences` 套用每 IP 速率限制，防止暴力列舉與 DDoS。

#### Scenario: 正常瀏覽速率
- **WHEN** 同一 IP 在 1 分鐘內發送不超過 100 次請求
- **THEN** 系統正常回傳資料

#### Scenario: 超過速率限制
- **WHEN** 同一 IP 在 1 分鐘內發送超過 100 次請求
- **THEN** 系統回傳 HTTP 429，body 為 `{ error: "請求過於頻繁，請稍後再試。" }`

### Requirement: 訂單與預約 API 速率限制
系統 SHALL 對 `POST /api/orders` 與 `POST /api/bookings` 套用每 IP 速率限制，防止自動化攻擊。

#### Scenario: 正常下單速率
- **WHEN** 同一 IP 在 1 分鐘內發送不超過 20 次 POST 請求
- **THEN** 系統正常處理訂單或預約

#### Scenario: 超過下單速率限制
- **WHEN** 同一 IP 在 1 分鐘內發送超過 20 次 POST 請求至 `/api/orders` 或 `/api/bookings`
- **THEN** 系統回傳 HTTP 429，body 為 `{ error: "請求過於頻繁，請稍後再試。" }`
