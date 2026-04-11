## MODIFIED Requirements

### Requirement: 後台登入採密碼驗證，使用 timing-safe 比對
系統 SHALL 使用 `timingSafeEqual` 比對密碼，防止 timing attack。密碼正確後，若 2FA 已啟用則進入 TOTP 驗證流程；若未啟用則直接完成登入。

#### Scenario: 密碼正確且 2FA 未啟用，直接登入成功
- **WHEN** `POST /api/admin/auth` 傳入正確密碼，且 TOTP 尚未設定
- **THEN** 計算 HMAC-SHA256 token，設定 `admin_session` HttpOnly Cookie（7天），回傳 `{ ok: true }`

#### Scenario: 密碼正確且 2FA 已啟用，進入 TOTP 步驟
- **WHEN** `POST /api/admin/auth` 傳入正確密碼，且 TOTP 已設定
- **THEN** 設定臨時 `admin_pending` cookie（15 分鐘），回傳 `{ require2fa: true }`，不設定 `admin_session`

#### Scenario: 密碼錯誤，固定延遲回應
- **WHEN** 密碼不符
- **THEN** 延遲 800ms 後回傳 HTTP 401，記錄該 IP 失敗次數
