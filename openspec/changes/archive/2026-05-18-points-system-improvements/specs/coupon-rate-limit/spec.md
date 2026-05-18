## ADDED Requirements

### Requirement: 通用碼驗證頻率限制
系統 SHALL 對通用碼驗證端點實施 rate limit，防止暴力破解。

#### Scenario: 正常使用不觸發
- **WHEN** 同一 IP 每分鐘內嘗試驗證次數 <= 10 次
- **THEN** 正常回應驗證結果

#### Scenario: 超過限制回傳 429
- **WHEN** 同一 IP 每分鐘內嘗試驗證次數 > 10 次
- **THEN** 回傳 HTTP 429 Too Many Requests，附帶 retry-after header

#### Scenario: 結帳流程也受限
- **WHEN** 結帳 API 中的通用碼驗證觸發 rate limit
- **THEN** 回傳 429，前端顯示「操作太頻繁，請稍後再試」
