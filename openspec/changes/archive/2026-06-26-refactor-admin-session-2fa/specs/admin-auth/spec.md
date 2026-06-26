## MODIFIED Requirements

### Requirement: 後台登入採密碼驗證，使用 timing-safe 比對

系統 SHALL 使用 `timingSafeEqual` 比對密碼，防止 timing attack。密碼正確後，若 2FA 已啟用則進入 TOTP 驗證流程；若未啟用則直接核發 DB-backed session。

#### Scenario: 密碼正確且 2FA 未啟用，直接登入成功

- **WHEN** `POST /api/admin/auth` 傳入正確密碼，且 TOTP 尚未設定
- **THEN** 產生隨機 session token、寫入 `admin_sessions`，設定 `admin_session` HttpOnly Cookie（7天），回傳 `{ ok: true }`

#### Scenario: 密碼正確且 2FA 已啟用，進入 TOTP 步驟

- **WHEN** `POST /api/admin/auth` 傳入正確密碼，且 TOTP 已設定
- **THEN** 設定臨時 `admin_pending` cookie（10 分鐘），回傳 `{ require2fa: true }`，不設定 `admin_session`

#### Scenario: 密碼錯誤，固定延遲回應

- **WHEN** 密碼不符
- **THEN** 延遲 800ms 後回傳 HTTP 401，記錄該 IP 失敗次數

### Requirement: 後台受保護路由須驗證 admin_session Cookie

系統 SHALL 在所有後台路由，以 `validate_admin_session` RPC 查詢 `admin_sessions` 資料表，驗證 `admin_session` cookie 的 token 是否存在且未過期。

#### Scenario: 未攜帶 Cookie 存取後台 API

- **WHEN** 請求未帶有效 `admin_session` cookie
- **THEN** 系統回傳 HTTP 401

#### Scenario: token 存在於 DB 且未過期

- **WHEN** `admin_session` cookie 的 token 在 `admin_sessions` 中存在且未過期
- **THEN** 系統允許請求通過

### Requirement: 登出清除 Cookie

系統 SHALL 在 `DELETE /api/admin/auth` 時，從 `admin_sessions` 刪除對應 token，並將 `admin_session` Cookie 設定為空值並 maxAge=0。

#### Scenario: 登出

- **WHEN** `DELETE /api/admin/auth`
- **THEN** 對應 token 從 `admin_sessions` 刪除，`admin_session` Cookie 被清除，回傳 `{ ok: true }`
