## Context

目前 `admin_session` cookie 值等於 `HMAC(ADMIN_PASSWORD, "wujue-admin-v1")`：一個**只要知道密碼就能自行計算**的固定字串。攻擊者（或知道密碼的前員工）只需在瀏覽器設定此 cookie，即可繞過 TOTP 直接進入後台。此外 token 無法在不改密碼的情況下撤銷，也無法追蹤哪些 session 仍在活躍。

專案已有 Supabase（service_role），Edge Runtime 可使用 Web Crypto API，`proxy.ts` 已能建立 Supabase 匿名客端。

## Goals / Non-Goals

**Goals:**
- Session token 改為隨機值，不可由密碼推算
- 2FA 完成前不發正式 session（修正現有 2FA 可繞過問題）
- Session 可撤銷（登出即從 DB 刪除，不需等到 cookie 過期）
- proxy.ts（Edge Runtime）維持輕量驗證，不引入 service_role key 進 middleware

**Non-Goals:**
- 多管理員帳號（目前仍為單一 `ADMIN_PASSWORD`）
- Session 活動日誌（審計日誌仍由 `admin_audit_logs` 處理）
- 2FA 設定流程本身的變更（已有 TOTP 設定頁，不動）

## Decisions

- **隨機 token 以 `crypto.randomBytes(32).toString('hex')` 產生**：Node.js API route 環境可用，產出 64 字元 hex，碰撞機率可忽略。生成點在 `/api/admin/auth/2fa` 與 `/api/admin/auth`（2FA 未啟用時），不在 Edge middleware。

- **DB 驗證使用 `security definer` RPC（`validate_admin_session`）而非 service_role key**：proxy.ts 以匿名客端呼叫此 RPC；RPC 本身以建立者權限執行，可讀取 RLS 保護的 `admin_sessions`。如此 service_role key 只出現在 API routes，不進 Edge middleware。

- **寫入與刪除 session 使用 `@/lib/supabase`（service_role）**：2fa route 與 auth route（2FA 未啟用路徑）建立 session；logout 刪除 session。兩者皆為 Node.js runtime，可直接用 service_role client。

- **2FA 未啟用時的路徑同樣改用 DB session**：維持一致的驗證機制，不保留舊的 HMAC 路徑作為後門。

- **驗證失敗 → fail-closed（401）**：Admin auth 是高風險路徑，DB 故障時應拒絕而非放行（與限流的 fail-open 策略相反）。

- **舊 token 在部署後立即失效**：DB 中無對應記錄，proxy.ts 回傳 false，管理員被導回登入頁。可接受，無需遷移。

## Risks / Trade-offs

- [部署後所有管理員被登出] → 預期行為，提前告知即可；重新登入一次完成
- [Supabase 故障時後台完全不可用（fail-closed）] → 正確的取捨；審計操作不應在無法記錄的情況下放行
- [RPC `validate_admin_session` 每個受保護請求多一次 DB 查詢] → 後台請求量極低，可接受；RPC 查詢僅 primary key lookup，極快
- [過期 session 佔用 DB 空間] → `expires_at` 建索引；`proxy.ts` 在驗證時以 `gt('expires_at', now)` 篩除，過期記錄可定期清理或在登入時清除

## Migration Plan

1. 在 Supabase SQL Editor 執行 `supabase/admin_sessions.sql`（建表 + RPC）
2. 部署程式碼
3. 現有 `admin_session` cookie 在 proxy.ts DB lookup 中找不到對應記錄 → 自動導回 `/admin` 登入頁
4. 管理員重新登入即可取得新格式 session
5. 回滾：還原 `proxy.ts`、`admin-token.ts`、auth/2fa routes 至舊版本；舊 token 計算方式不需 DB
