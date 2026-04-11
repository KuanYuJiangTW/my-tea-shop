## Why

目前管理後台只有單因素密碼驗證，CSP 使用 `'unsafe-inline'` 削弱 XSS 防護，後台操作也沒有任何日誌記錄，一旦帳號被盜或發生異常資料變更，無從追查。這三個低風險問題長期存在會成為系統弱點，應在網站穩定後一併補強。

## What Changes

- **管理後台 2FA（TOTP）**：登入流程新增第二步驟，密碼通過後需輸入 TOTP 驗證碼（Google Authenticator 等），初次設定時掃描 QR Code 綁定
- **CSP nonce-based**：middleware 為每個請求動態生成 nonce，替換 `'unsafe-inline'`，強化 XSS 防護
- **管理操作審計日誌**：`withAdminAuth` wrapper 在每次成功的管理操作後寫入 Supabase `admin_audit_logs` 資料表，記錄操作類型、資源、時間

## Capabilities

### New Capabilities
- `admin-2fa-totp`: 管理後台 TOTP 雙因素驗證（設定流程 + 登入驗證）
- `admin-audit-log`: 管理操作審計日誌，記錄所有後台寫入操作
- `csp-nonce`: Nonce-based Content Security Policy，移除 script-src 的 `'unsafe-inline'`

### Modified Capabilities
- `admin-auth`: 登入流程新增 TOTP 驗證步驟

## Impact

- `src/proxy.ts`（middleware）— 新增 nonce 生成與注入
- `next.config.ts` — CSP 改為 nonce-based 動態設定
- `src/app/admin/layout.tsx` 或 root layout — 讀取 nonce 供 Script 標籤使用
- `src/app/api/admin/auth/route.ts` — 登入 API 加入 TOTP 驗證步驟
- `src/app/api/admin/2fa/` — 新增 2FA 設定 API（setup、verify、disable）
- `src/app/admin/settings/` — 新增 2FA 設定頁面
- `src/lib/admin-auth-guard.ts` — 加入審計日誌寫入
- Supabase — 新增 `admin_audit_logs` 資料表
- 新增依賴：`otplib`、`qrcode`
