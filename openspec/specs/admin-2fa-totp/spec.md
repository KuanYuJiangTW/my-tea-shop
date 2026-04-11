### Requirement: 管理員可設定 TOTP 雙因素驗證
系統 SHALL 提供 TOTP 設定流程，讓管理員透過 Google Authenticator 等 App 綁定驗證器。

#### Scenario: 初次設定 2FA
- **WHEN** 管理員進入設定頁面並點擊「啟用 2FA」
- **THEN** 系統生成 TOTP secret，顯示 QR Code 供掃描，並要求輸入一組 TOTP 驗證碼確認綁定

#### Scenario: 確認綁定成功
- **WHEN** 管理員輸入正確的 6 位 TOTP 驗證碼
- **THEN** 系統將 secret 儲存至 `admin_settings` 資料表，並顯示「2FA 已啟用」

#### Scenario: 確認碼錯誤
- **WHEN** 管理員輸入錯誤的 TOTP 驗證碼
- **THEN** 系統回傳 HTTP 400 `{ error: "驗證碼錯誤，請重試" }`，不儲存 secret

### Requirement: 2FA 已啟用時登入需通過 TOTP 驗證
系統 SHALL 在密碼驗證成功後，若已設定 2FA，要求管理員輸入 TOTP 驗證碼才能完成登入。

#### Scenario: 密碼正確後進入 2FA 驗證步驟
- **WHEN** `POST /api/admin/auth` 密碼正確，且 2FA 已啟用
- **THEN** 設定臨時 `admin_pending` cookie（10 分鐘有效），回傳 `{ require2fa: true }`

#### Scenario: TOTP 驗證通過
- **WHEN** `POST /api/admin/auth/2fa` 傳入有效的 6 位驗證碼，且 `admin_pending` cookie 有效
- **THEN** 清除 `admin_pending`，設定正式 `admin_session` cookie，回傳 `{ ok: true }`

#### Scenario: TOTP 驗證碼錯誤
- **WHEN** `POST /api/admin/auth/2fa` 傳入無效驗證碼
- **THEN** 回傳 HTTP 401 `{ error: "驗證碼錯誤" }`，不設定 session

#### Scenario: 2FA 未設定時直接登入
- **WHEN** `POST /api/admin/auth` 密碼正確，且 2FA 尚未啟用
- **THEN** 直接設定 `admin_session` cookie，回傳 `{ ok: true }`（向下相容）

### Requirement: 管理員可停用 2FA
系統 SHALL 允許已設定 2FA 的管理員停用，停用時需再次輸入 TOTP 驗證碼確認。

#### Scenario: 停用 2FA 成功
- **WHEN** 管理員提交正確驗證碼並確認停用
- **THEN** 系統清除 `admin_settings` 中的 TOTP secret，顯示「2FA 已停用」
