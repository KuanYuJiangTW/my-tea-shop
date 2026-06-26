## 1. DB 基礎設施

- [x] 1.1 新增 `supabase/admin_sessions.sql`：`admin_sessions` 表（token text primary key、created_at、expires_at、ip，啟用 RLS 不建 policy）+ `expires_at` 索引
- [x] 1.2 在 `admin_sessions.sql` 新增 `validate_admin_session(p_token text)` RPC（`security definer`，回傳 boolean，匿名客端可呼叫）
- [x] 1.3 在 Supabase SQL Editor 執行 `admin_sessions.sql`

## 2. Session token helper

- [x] 2.1 重寫 `src/lib/admin-token.ts`：移除 `computeAdminToken`，新增 `generateAdminSessionToken()` → `crypto.randomBytes(32).toString('hex')`
- [x] 2.2 在 `src/lib/admin-token.ts` 新增 `createAdminSession(token, ip)` → service_role supabase 寫入 `admin_sessions`（expires_at = now + 7 天）
- [x] 2.3 在 `src/lib/admin-token.ts` 新增 `deleteAdminSession(token)` → service_role supabase 從 `admin_sessions` 刪除

## 3. 更新密碼驗證路由

- [x] 3.1 `src/app/api/admin/auth/route.ts`（POST）：密碼正確且 2FA 未啟用時，改呼叫 `generateAdminSessionToken()` + `createAdminSession()`，移除 `computeAdminToken` 呼叫
- [x] 3.2 `src/app/api/admin/auth/route.ts`（DELETE）：呼叫 `deleteAdminSession(session)` 從 DB 刪除 token，再清除 cookie

## 4. 更新 2FA 路由

- [x] 4.1 `src/app/api/admin/auth/2fa/route.ts`（POST）：TOTP 驗證通過後改呼叫 `generateAdminSessionToken()` + `createAdminSession()`，移除 `computeAdminToken` 呼叫

## 5. 更新 proxy.ts session 驗證

- [x] 5.1 `src/proxy.ts`：Admin session 驗證改為呼叫 `validate_admin_session(token)` RPC（使用現有匿名 supabase client），移除 HMAC 計算與 `timingSafeEqual` 比對邏輯

## 6. 更新 admin-auth-guard.ts

- [x] 6.1 `src/lib/admin-auth-guard.ts`：session 驗證改為呼叫 `validateAdminSession`（Node.js 端 service_role 查詢），移除 `computeAdminToken` 與 `timingSafeEqual` 依賴

## 7. 清理與驗證

- [x] 7.1 確認 `computeAdminToken` 無其他呼叫端（含 `src/app/admin/page.tsx` 一併改用 `validateAdminSession`），已從 `src/lib/admin-token.ts` 刪除
- [x] 7.2 `tsc --noEmit` 通過（僅剩既有無關的 `admin-campaigns-audit.test.ts` AbortSignal 型別錯誤）
- [x] 7.3 `vitest run` 既有測試不新增失敗（314 passed；2 個失敗為既有無關的 `cron-anomaly-scan`）
- [ ] 7.4 手動驗證：密碼登入 → TOTP → 後台可用；登出後 cookie 清除且 DB 記錄刪除；舊格式 cookie 被自動導回登入頁（**需先執行 task 1.3 SQL**）
