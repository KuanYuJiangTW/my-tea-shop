# admin-2fa-totp Specification

## Purpose
後台管理員的 TOTP 雙因素驗證：綁定流程、登入時的驗證關卡、以及停用條件。後台掌握訂單與金流資料，密碼外洩時這是最後一道關。

## Requirements

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
系統 SHALL 在密碼驗證成功後，若已設定 2FA，要求管理員輸入 TOTP 驗證碼才能完成登入；通過後核發 DB-backed session token。

#### Scenario: 密碼正確後進入 2FA 驗證步驟
- **WHEN** `POST /api/admin/auth` 密碼正確，且 2FA 已啟用
- **THEN** 設定臨時 `admin_pending` cookie（10 分鐘有效），回傳 `{ require2fa: true }`，不設定 `admin_session`

#### Scenario: 偽造 admin_pending cookie
- **WHEN** 未通過密碼驗證，卻自行帶入 `admin_pending` cookie（如固定值 `1`）呼叫 `POST /api/admin/auth/2fa`
- **THEN** 回傳 HTTP 401 `{ error: "請先完成密碼驗證" }`，不建立 session
- **註**：`admin_pending` 的內容 SHALL 為伺服器以 `ADMIN_PASSWORD` 簽章、含有效期與隨機 nonce 的 token；MUST NOT 為固定值。httpOnly / sameSite 只約束瀏覽器，無法阻止攻擊者直接以 HTTP 客戶端帶入 cookie。

#### Scenario: TOTP 驗證碼窮舉
- **WHEN** 同一 IP 於 15 分鐘內累積 5 次 TOTP 驗證失敗
- **THEN** 後續請求回傳 HTTP 429，不進行驗證碼比對

#### Scenario: TOTP 驗證通過
- **WHEN** `POST /api/admin/auth/2fa` 傳入有效的 6 位驗證碼，且 `admin_pending` cookie 有效
- **THEN** 清除 `admin_pending`，產生隨機 session token、寫入 `admin_sessions`，設定正式 `admin_session` cookie，回傳 `{ ok: true }`

#### Scenario: TOTP 驗證碼錯誤
- **WHEN** `POST /api/admin/auth/2fa` 傳入無效驗證碼
- **THEN** 回傳 HTTP 401 `{ error: "驗證碼錯誤" }`，不建立 session
- **註**：otplib v13 的 `verify()` 回傳 `{ valid: boolean }` 物件而非 boolean。驗證結果 SHALL 取 `.valid` 判斷；直接判斷回傳值會因物件恆為 truthy 而使任何驗證碼皆通過。

#### Scenario: 2FA 未設定時直接登入
- **WHEN** `POST /api/admin/auth` 密碼正確，且 2FA 尚未啟用
- **THEN** 直接產生隨機 session token、寫入 `admin_sessions`，設定 `admin_session` cookie，回傳 `{ ok: true }`

### Requirement: 管理員可停用 2FA
系統 SHALL 允許已設定 2FA 的管理員停用，停用時需再次輸入 TOTP 驗證碼確認。

#### Scenario: 停用 2FA 成功
- **WHEN** 管理員提交正確驗證碼並確認停用
- **THEN** 系統清除 `admin_settings` 中的 TOTP secret，顯示「2FA 已停用」
