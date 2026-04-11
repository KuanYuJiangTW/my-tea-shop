## Context

目前三個待補強的安全功能各自獨立，但都圍繞在「管理後台」這個攻擊面：

- **CSP unsafe-inline**：`next.config.ts` 靜態設定 CSP，無法使用 nonce；Next.js App Router hydration 需要 inline script，所以目前被迫使用 `'unsafe-inline'`
- **2FA 缺失**：`/api/admin/auth` 只驗證密碼，密碼洩漏即全線失守
- **無審計日誌**：`withAdminAuth` 只驗證身份，不記錄操作，無法事後追查

現有基礎設施：
- `src/proxy.ts`（middleware）：已有 nonce 相關註釋，處理 Supabase session 刷新與 admin 路由保護
- `src/lib/admin-auth-guard.ts`：已有 `withAdminAuth` wrapper，是注入審計日誌的最佳位置
- Supabase：已是主要資料存儲，適合放審計日誌資料表

## Goals / Non-Goals

**Goals:**
- 移除 CSP 中的 `'unsafe-inline'`，改用 per-request nonce
- 管理後台登入加入 TOTP 第二驗證步驟
- 所有後台 POST/PATCH/DELETE 操作自動寫入審計日誌

**Non-Goals:**
- 不實作 2FA 備用碼（recovery codes）
- 不實作 style-src nonce（Google Fonts 需要 unsafe-inline，暫維持）
- 不實作審計日誌的前台查詢頁面（僅寫入，查詢用 Supabase 控制台即可）
- 不改動 Vercel KV rate limiting

## Decisions

### 1. CSP Nonce 實作方式

**決定**：在 `proxy.ts` middleware 生成 nonce，透過 `x-nonce` request header 傳遞，在 root layout 的 `<Script>` 標籤讀取並套用；`next.config.ts` 的靜態 CSP header 改由 middleware 動態設定。

**理由**：
- Next.js 官方建議的 nonce 實作方式
- Middleware 可攔截所有請求，適合動態生成 nonce
- `next.config.ts` 的 headers 是靜態的，無法加入動態 nonce，需移至 middleware

**注意**：Next.js App Router 的 hydration script 在使用 nonce 後仍需 `'strict-dynamic'`，讓瀏覽器自動信任被 nonce script 動態載入的子 script。

### 2. TOTP 2FA 實作

**決定**：使用 `otplib` 函式庫，TOTP secret 儲存在 Supabase `admin_settings` 資料表（加密）或環境變數。初次設定時顯示 QR Code（`qrcode` 函式庫）。

**登入流程**：
```
1. POST /api/admin/auth { password } → 驗證密碼
2. 密碼正確 → 設定臨時 cookie admin_pending（15 分鐘有效）
3. 前端導向 2FA 驗證頁 /admin/verify-2fa
4. POST /api/admin/auth/2fa { code } → 驗證 TOTP
5. 通過 → 清除 admin_pending，設定正式 admin_session cookie
```

**2FA 未設定時**：跳過步驟 2-4，直接設定 admin_session（向下相容，避免鎖死）

**替代方案**：email OTP → 依賴 email 服務，網路延遲影響體驗；排除。

### 3. 審計日誌

**決定**：在 `withAdminAuth` 中新增可選的 `action` 參數，POST/PATCH/DELETE 操作傳入操作名稱，成功後寫入 Supabase `admin_audit_logs`。GET 操作不記錄（讀取不影響資料）。

**資料表結構**：
```sql
CREATE TABLE admin_audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  action      TEXT NOT NULL,         -- e.g. "update_product", "delete_session"
  resource_id TEXT,                  -- e.g. product id
  detail      JSONB,                 -- 變更摘要
  ip          TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

**寫入時機**：handler 成功回傳 2xx 後非同步寫入（不阻塞回應）

## Risks / Trade-offs

- **2FA 設定遺失風險** → 若 TOTP secret 遺失，需透過直接存取資料庫或環境變數重設；記錄在 README
- **CSP nonce 與 Google Analytics** → GTM inline script 需要 nonce 或改用外部載入；需測試
- **審計日誌寫入失敗** → 使用 fire-and-forget（不 await），不影響正常操作，但可能遺漏日誌；可接受

## Migration Plan

1. 審計日誌：建 Supabase table → 更新 `withAdminAuth` → 部署
2. CSP nonce：更新 middleware → 更新 next.config.ts → 測試所有頁面 → 部署
3. 2FA：安裝依賴 → 建 API → 建前端 → 測試整個登入流程 → 部署

每步獨立可部署，2FA 向下相容（未設定時跳過）。
