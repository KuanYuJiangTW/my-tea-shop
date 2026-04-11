## ADDED Requirements

### Requirement: 後台 API 路由層級身份驗證
系統 SHALL 提供可複用的 `withAdminAuth` wrapper，讓每個 `/api/admin/*` 路由 handler 自行驗證 `admin_session` cookie，不依賴 middleware 作為唯一防線。

#### Scenario: 有效 admin_session cookie
- **WHEN** 請求帶有有效的 `admin_session` cookie（HMAC-SHA256 驗證通過）
- **THEN** handler 正常執行

#### Scenario: 缺少 admin_session cookie
- **WHEN** 請求未帶 `admin_session` cookie
- **THEN** 系統回傳 HTTP 401，body 為 `{ error: "Unauthorized" }`

#### Scenario: 無效或偽造的 admin_session cookie
- **WHEN** 請求帶有格式錯誤或簽章不符的 `admin_session` cookie
- **THEN** 系統回傳 HTTP 401，body 為 `{ error: "Unauthorized" }`

### Requirement: 所有後台 API 路由套用 withAdminAuth
以下路由的所有 HTTP methods SHALL 套用 `withAdminAuth`：
- `/api/admin/experience-sessions`（GET、POST）
- `/api/admin/products`（GET、POST）
- `/api/admin/products/[id]`（PATCH、DELETE）
- `/api/admin/reviews/[id]`（PATCH）
- `/api/admin/experience-bookings/[id]`（PATCH）
- `/api/admin/upload-image`（POST）

#### Scenario: 未授權存取後台商品 API
- **WHEN** 未帶 cookie 的請求送至 `GET /api/admin/products`
- **THEN** 系統回傳 HTTP 401，不回傳任何商品資料

#### Scenario: 未授權存取後台場次 API
- **WHEN** 未帶 cookie 的請求送至 `POST /api/admin/experience-sessions`
- **THEN** 系統回傳 HTTP 401，不建立任何場次
