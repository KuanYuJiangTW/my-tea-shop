## 1. 審計日誌

- [x] 1.1 在 Supabase 建立 `admin_audit_logs` 資料表（欄位：id、action、resource_id、detail jsonb、ip、created_at）
- [x] 1.2 更新 `src/lib/admin-auth-guard.ts`，`withAdminAuth` 接受可選的 `{ action, resourceId }` 參數，handler 回傳 2xx 後非同步寫入審計日誌
- [x] 1.3 更新各後台路由傳入 action 名稱：`experience-sessions` POST 傳 `create_session`、`products` POST 傳 `create_product`、`products/[id]` PATCH 傳 `update_product`、DELETE 傳 `delete_product`、`reviews/[id]` PATCH 傳 `update_review`、`experience-bookings/[id]` PATCH 傳 `update_booking`

## 2. CSP Nonce

- [x] 2.1 在 `src/proxy.ts` middleware 加入 nonce 生成（`crypto.randomBytes(16).toString('base64')`），設定 `x-nonce` request header
- [x] 2.2 將 `next.config.ts` 的靜態 CSP headers 移除（或保留作 fallback），改在 middleware 動態設定含 nonce 的 CSP response header（`script-src 'nonce-{nonce}' 'strict-dynamic'`）
- [x] 2.3 在 root layout（`src/app/layout.tsx`）讀取 `headers()` 的 `x-nonce`，傳給所有 `<Script>` 標籤的 `nonce` 屬性
- [x] 2.4 本機測試所有頁面（首頁、產品頁、後台）確認無 CSP 違規，Google Analytics 正常載入

## 3. 管理後台 2FA（TOTP）

- [x] 3.1 安裝依賴：`npm install otplib qrcode` 與型別 `@types/qrcode`
- [x] 3.2 在 Supabase 建立 `admin_settings` 資料表（欄位：key text PRIMARY KEY、value text），或直接使用環境變數 `ADMIN_TOTP_SECRET` 儲存 TOTP secret
- [x] 3.3 建立 `src/app/api/admin/auth/2fa/route.ts`：POST 驗證 TOTP 碼（需有效 `admin_pending` cookie），通過後設定正式 `admin_session`
- [x] 3.4 建立 `src/app/api/admin/2fa/setup/route.ts`：GET 生成新 secret 與 QR Code data URL、POST 確認綁定（驗證碼正確後儲存 secret）
- [x] 3.5 建立 `src/app/api/admin/2fa/disable/route.ts`：POST 驗證 TOTP 碼後清除 secret
- [x] 3.6 更新 `src/app/api/admin/auth/route.ts`：密碼正確後判斷 2FA 狀態，已啟用則設定 `admin_pending` cookie 並回傳 `{ require2fa: true }`
- [x] 3.7 建立 `src/app/admin/verify-2fa/page.tsx`：輸入 6 位驗證碼的頁面，提交後呼叫 `/api/admin/auth/2fa`，成功導向後台
- [x] 3.8 更新 `src/app/admin/page.tsx`（登入頁）：收到 `require2fa: true` 時導向 `/admin/verify-2fa`
- [x] 3.9 建立 `src/app/admin/(protected)/settings/page.tsx`：顯示 2FA 狀態、設定/停用按鈕與 QR Code
- [x] 3.10 更新 `src/proxy.ts`：`/admin/verify-2fa` 路由允許持有 `admin_pending` cookie 的請求通過（不重導向登入頁）
