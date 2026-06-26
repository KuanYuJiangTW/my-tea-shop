## ADDED Requirements

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

### Requirement: IP Rate Limiting：15 分鐘內最多 5 次失敗
系統 SHALL 在 15 分鐘視窗內，對同一 IP 超過 5 次失敗嘗試，回傳 429 並鎖定至視窗結束。

#### Scenario: 超過嘗試次數
- **WHEN** 同一 IP 在 15 分鐘內第 6 次（或以上）失敗
- **THEN** 系統立即回傳 HTTP 429 `{ error: "太多失敗嘗試，請 15 分鐘後再試。" }`

#### Scenario: 登入成功後清除失敗記錄
- **WHEN** 登入成功
- **THEN** 清除該 IP 的失敗計數

### Requirement: Cookie 採 HttpOnly、SameSite=Strict、Secure
系統 SHALL 設定安全 Cookie 屬性，防止 XSS 與 CSRF 攻擊。

#### Scenario: 生產環境 Cookie 設定
- **WHEN** `NODE_ENV = "production"`
- **THEN** Cookie 設定 `httpOnly: true`、`secure: true`、`sameSite: "strict"`、`maxAge: 604800`（7 天）

### Requirement: 登出清除 Cookie
系統 SHALL 在 `DELETE /api/admin/auth` 時，從 `admin_sessions` 刪除對應 token，並將 `admin_session` Cookie 設定為空值並 maxAge=0。

#### Scenario: 登出
- **WHEN** `DELETE /api/admin/auth`
- **THEN** 對應 token 從 `admin_sessions` 刪除，`admin_session` Cookie 被清除，回傳 `{ ok: true }`

### Requirement: 後台受保護路由須驗證 admin_session Cookie
系統 SHALL 在所有後台路由，以 `validate_admin_session` RPC 查詢 `admin_sessions` 資料表，驗證 `admin_session` cookie 的 token 是否存在且未過期。

#### Scenario: 未攜帶 Cookie 存取後台 API
- **WHEN** 請求未帶有效 `admin_session` cookie
- **THEN** 系統回傳 HTTP 401

#### Scenario: token 存在於 DB 且未過期
- **WHEN** `admin_session` cookie 的 token 在 `admin_sessions` 中存在且未過期
- **THEN** 系統允許請求通過

### Requirement: 後台側欄提供 Sanity Studio 快速入口
後台側欄 SHALL 在「茶山體驗」群組內顯示「內容管理」連結，點擊後以新分頁開啟 `/studio`。

#### Scenario: 點擊內容管理連結
- **WHEN** 管理員點擊側欄「茶山體驗」群組內的「內容管理」連結
- **THEN** 瀏覽器以新分頁開啟 `/studio`，原後台分頁保持不變

#### Scenario: 內容管理連結帶有外部連結視覺提示
- **WHEN** 側欄渲染完成
- **THEN** 「內容管理」連結旁顯示外部連結圖示，提示使用者將離開後台

### Requirement: 後台側欄採分組式導航結構
後台側欄 SHALL 將導航項目依業務分組顯示，包含：
- 儀表板（獨立項目）
- **茶山體驗** 群組：體驗管理、評價管理、內容管理
- **商品** 群組：訂單管理、產品管理

#### Scenario: 側欄顯示分組標題
- **WHEN** 管理員查看後台側欄
- **THEN** 「茶山體驗」與「商品」群組標題以小字樣式顯示於對應項目上方

#### Scenario: 群組內項目的 active 狀態
- **WHEN** 管理員目前在 `/admin/experiences` 頁面
- **THEN** 「體驗管理」項目顯示 active 樣式，其餘項目不顯示
