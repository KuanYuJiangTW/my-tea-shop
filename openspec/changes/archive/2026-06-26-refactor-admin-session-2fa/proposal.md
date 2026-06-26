## Why

`admin_session` cookie 的值是 `HMAC(ADMIN_PASSWORD, "wujue-admin-v1")` 的固定雜湊，只要知道管理員密碼便可自行計算出 token、直接寫入 cookie，繞過 TOTP 二階段驗證進入後台；且 token 永遠不會輪替、無法撤銷。2FA 目前形同虛設，是上線安全稽核中唯一仍待修的中風險項目。

## What Changes

- **移除**固定 HMAC 作為 session token 的機制
- **新增** `admin_sessions` 資料表（隨機 token、建立時間、過期時間、來源 IP）
- 密碼驗證通過後只核發**臨時 pending token**（短效、不授予後台權限），不直接開 session
- TOTP 驗證通過後才寫入正式 session token 到 DB，並將隨機 token 設入 `admin_session` cookie
- `proxy.ts` 與 `admin-auth-guard.ts` 改為查 DB 驗證 session，而非重算密碼雜湊
- 登出時從 DB 刪除 session（可撤銷）

## Capabilities

### New Capabilities

- `admin-session-management`：DB 儲存的隨機 session token 生命週期管理（核發、驗證、撤銷、過期）

### Modified Capabilities

- `admin-auth`：密碼驗證通過後改核發 pending token，不直接開 session；session 改由 DB lookup 驗證
- `admin-2fa-totp`：TOTP 驗證通過後觸發正式 session token 寫入 DB，pending token 作廢

## Impact

- `supabase/admin_sessions.sql`（新增）：`admin_sessions` 表定義 + RLS（service_role only）
- `src/lib/admin-token.ts`：移除 `computeAdminToken`，改為隨機 token 產生
- `src/lib/admin-auth-guard.ts`：session 驗證改為 DB lookup
- `src/proxy.ts`：middleware session 驗證改為 DB lookup（Edge Runtime 相容）
- `src/app/api/admin/auth/route.ts`：密碼驗證後核發短效 pending token
- `src/app/api/admin/auth/2fa/route.ts`：TOTP 通過後寫入正式 session、清除 pending
- `src/app/api/admin/auth/logout/route.ts`（如存在）：呼叫 DB 刪除 session
