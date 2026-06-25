## ADDED Requirements

### Requirement: Durable cross-instance rate limiting

系統 SHALL 以持久化儲存（Supabase `rate_limits` 表）作為限流計數的後端，使限流在多個 serverless instance 之間一致生效，而非僅在單一 instance 的記憶體內有效。

#### Scenario: 同一來源跨 instance 累計

- **WHEN** 同一 IP 在同一時間視窗內對受保護端點發出超過上限的請求，且請求被分散到不同 serverless instance
- **THEN** 系統 SHALL 以共用的持久化計數判斷並回應 HTTP 429，不因換 instance 而重置計數

#### Scenario: 視窗過後重置

- **WHEN** 計數視窗（windowMs）已過
- **THEN** 系統 SHALL 視為新視窗，計數從 1 重新累計

### Requirement: Fail-open on limiter backend failure

限流機制在後端不可用時 SHALL fail-open（放行請求），避免限流基礎設施故障導致所有正常使用者被阻擋。

#### Scenario: 限流後端故障

- **WHEN** 限流的 RPC 或查詢回傳錯誤或拋出例外
- **THEN** 系統 SHALL 允許該請求通過，並記錄錯誤日誌，而非回應 429 或 500

### Requirement: Shared limiter helpers for API routes

系統 SHALL 提供共用的限流函式供各 API 路由使用：每次請求型限流（遞增並判斷上限）、唯讀檢查（只查不增，供「只計失敗次數」場景如後台登入）、遞增與重置。

#### Scenario: 每次請求型限流

- **WHEN** 路由以 key、上限、視窗呼叫每次請求型限流函式且當前計數未超過上限
- **THEN** 函式 SHALL 遞增計數並回傳「允許」

#### Scenario: 後台登入只計失敗

- **WHEN** 後台登入密碼錯誤
- **THEN** 系統 SHALL 只在失敗時遞增計數；登入成功時 SHALL 清除該來源的失敗計數
