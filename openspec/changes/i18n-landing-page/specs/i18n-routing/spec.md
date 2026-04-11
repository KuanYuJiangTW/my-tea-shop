## ADDED Requirements

### Requirement: URL-based locale 路由
系統 SHALL 以 URL 前綴區分語言：中文為預設語言（無前綴），英文加 `/en/` 前綴。

#### Scenario: 中文預設路由
- **WHEN** 使用者訪問 `/`、`/products`、`/experiences` 等路徑
- **THEN** 顯示中文內容，不做任何 redirect

#### Scenario: 英文路由
- **WHEN** 使用者訪問 `/en/`、`/en/products`、`/en/experiences`
- **THEN** 顯示對應的英文內容

#### Scenario: 無效 locale 處理
- **WHEN** 使用者訪問 `/fr/products`（不支援的語言）
- **THEN** 回傳 404

### Requirement: Admin 與 API 路由不受 locale middleware 影響
系統 SHALL 確保 `/admin/*` 和 `/api/*` 路徑完全繞過 next-intl middleware，維持原有行為。

#### Scenario: Admin 登入不受影響
- **WHEN** 使用者訪問 `/admin/login`
- **THEN** 正常顯示 Admin 登入頁，不加入任何 locale 前綴或處理

#### Scenario: API 路由不受影響
- **WHEN** 前端呼叫 `POST /api/bookings`
- **THEN** API route 正常執行，不受 locale middleware 攔截

### Requirement: locale 設定透過 next-intl 注入
系統 SHALL 在 Server Component 可透過 `getLocale()` 取得當前語言，Client Component 可透過 `useLocale()` 取得。

#### Scenario: Server Component 取得 locale
- **WHEN** Server Component 呼叫 `getLocale()`
- **THEN** 回傳當前請求的 locale（`"zh"` 或 `"en"`）

#### Scenario: Client Component 取得 locale
- **WHEN** Client Component 呼叫 `useLocale()`
- **THEN** 回傳當前 locale，不需額外 props 傳遞
