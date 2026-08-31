# admin-audit-log Specification

## Purpose
後台寫入操作的審計日誌：什麼時候記錄、必須包含哪些足以追查的資訊。目的是讓「誰在什麼時候改了什麼」事後查得出來，而不是只能靠印象。

## Requirements

### Requirement: 後台寫入操作自動記錄審計日誌
系統 SHALL 在所有後台 POST、PATCH、DELETE 操作成功後，非同步寫入 Supabase `admin_audit_logs` 資料表。

#### Scenario: 成功的後台寫入操作
- **WHEN** 後台 API 的 POST/PATCH/DELETE handler 回傳 2xx
- **THEN** 系統非同步寫入日誌，包含 `action`、`resource_id`、`detail`（操作摘要）、`ip`、`created_at`

#### Scenario: 後台 GET 操作不記錄
- **WHEN** 後台 API 的 GET handler 被呼叫
- **THEN** 系統不寫入任何審計日誌

#### Scenario: 日誌寫入失敗不影響正常操作
- **WHEN** Supabase 寫入審計日誌失敗（網路錯誤等）
- **THEN** 後台 API 的回應不受影響，錯誤只記錄到 `console.error`

### Requirement: 審計日誌包含足夠的追查資訊
每筆審計日誌 SHALL 記錄以下欄位：

#### Scenario: 日誌資料完整性
- **WHEN** 任何後台寫入操作被記錄
- **THEN** 日誌包含：`action`（操作名稱，如 `update_product`）、`resource_id`（受影響資源的 ID）、`ip`（操作者 IP）、`created_at`（UTC 時間戳）
