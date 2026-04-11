### Requirement: 每個請求動態生成 CSP nonce
系統 SHALL 在 middleware 為每個請求生成唯一的 base64 nonce，並注入至 CSP header 的 `script-src`，取代 `'unsafe-inline'`。

#### Scenario: Nonce 注入至 CSP
- **WHEN** 任何頁面請求通過 middleware
- **THEN** response header 包含 `Content-Security-Policy`，其中 `script-src` 包含 `'nonce-{random}'` 和 `'strict-dynamic'`，不包含 `'unsafe-inline'`

#### Scenario: Nonce 傳遞至 layout
- **WHEN** middleware 處理請求
- **THEN** `x-nonce` request header 設定為當次生成的 nonce 值，供 Server Component 讀取

### Requirement: Next.js Script 標籤套用 nonce
系統 SHALL 在 root layout 讀取 `x-nonce` header，並將其套用至所有 `<Script>` 標籤。

#### Scenario: Google Analytics Script 套用 nonce
- **WHEN** 頁面渲染 root layout
- **THEN** Google Analytics `<Script>` 標籤包含與 CSP header 相符的 `nonce` 屬性
