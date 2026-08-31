# admin-session-management Specification

## Purpose
後台 session 的生命週期：隨機 token 核發、每次請求查資料庫驗證有效性、登出時撤銷。不使用可離線偽造的無狀態 token。

## Requirements

### Requirement: 隨機 session token 核發

系統 SHALL 在管理員完成最終驗證步驟（密碼驗證（2FA 未啟用）或 TOTP 驗證通過）後，以 `crypto.randomBytes(32).toString('hex')` 產生 64 字元隨機 token，並將其寫入 `admin_sessions` 資料表（含 `expires_at = now() + 7天` 與來源 IP）。

#### Scenario: 核發新 session

- **WHEN** 管理員完成最終驗證步驟
- **THEN** 系統 SHALL 在 `admin_sessions` 插入一筆記錄（token、created_at、expires_at、ip），並將 token 設入 `admin_session` HttpOnly cookie

#### Scenario: token 不可由密碼推算

- **WHEN** 攻擊者知道 ADMIN_PASSWORD 並嘗試自行計算 session token
- **THEN** 自行計算的值在 `admin_sessions` 中找不到對應記錄，驗證失敗

### Requirement: DB 查詢驗證 session 有效性

系統 SHALL 透過 `validate_admin_session(token)` RPC 驗證每個受保護請求的 `admin_session` cookie：查詢 `admin_sessions` 是否存在未過期的對應記錄。RPC SHALL 以 `security definer` 定義，允許匿名客端呼叫而不需 service_role key 進入 Edge middleware。

#### Scenario: 有效 session

- **WHEN** `admin_session` cookie 的 token 在 `admin_sessions` 中存在且 `expires_at > now()`
- **THEN** 系統 SHALL 允許請求通過，繼續路由處理

#### Scenario: 無效或過期 session

- **WHEN** token 在 DB 中不存在，或 `expires_at <= now()`
- **THEN** 系統 SHALL 對 API 請求回傳 HTTP 401，對頁面請求轉址至 `/admin`

#### Scenario: DB 查詢失敗（fail-closed）

- **WHEN** `validate_admin_session` RPC 回傳錯誤
- **THEN** 系統 SHALL 視為驗證失敗，回傳 HTTP 401 或轉址（不放行）

### Requirement: 登出撤銷 session

系統 SHALL 在 `DELETE /api/admin/auth` 時，從 `admin_sessions` 刪除對應 token，使其立即失效，無需等待 cookie 過期。

#### Scenario: 主動登出

- **WHEN** `DELETE /api/admin/auth` 收到有效 `admin_session` cookie
- **THEN** 系統 SHALL 從 `admin_sessions` 刪除該 token，清除 cookie，回傳 `{ ok: true }`

#### Scenario: cookie 被竊後主動登出

- **WHEN** 管理員察覺異常並呼叫登出 API
- **THEN** 即使攻擊者仍持有 cookie，token 已從 DB 刪除，驗證將失敗
