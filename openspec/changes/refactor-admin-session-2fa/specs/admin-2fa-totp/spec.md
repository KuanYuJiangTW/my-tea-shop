## MODIFIED Requirements

### Requirement: 2FA 已啟用時登入需通過 TOTP 驗證

系統 SHALL 在密碼驗證成功後，若已設定 2FA，要求管理員輸入 TOTP 驗證碼才能完成登入；通過後核發 DB-backed session token。

#### Scenario: 密碼正確後進入 2FA 驗證步驟

- **WHEN** `POST /api/admin/auth` 密碼正確，且 2FA 已啟用
- **THEN** 設定臨時 `admin_pending` cookie（10 分鐘有效），回傳 `{ require2fa: true }`，不設定 `admin_session`

#### Scenario: TOTP 驗證通過

- **WHEN** `POST /api/admin/auth/2fa` 傳入有效的 6 位驗證碼，且 `admin_pending` cookie 有效
- **THEN** 清除 `admin_pending`，產生隨機 session token、寫入 `admin_sessions`，設定正式 `admin_session` cookie，回傳 `{ ok: true }`

#### Scenario: TOTP 驗證碼錯誤

- **WHEN** `POST /api/admin/auth/2fa` 傳入無效驗證碼
- **THEN** 回傳 HTTP 401 `{ error: "驗證碼錯誤" }`，不建立 session

#### Scenario: 2FA 未設定時直接登入

- **WHEN** `POST /api/admin/auth` 密碼正確，且 2FA 尚未啟用
- **THEN** 直接產生隨機 session token、寫入 `admin_sessions`，設定 `admin_session` cookie，回傳 `{ ok: true }`
