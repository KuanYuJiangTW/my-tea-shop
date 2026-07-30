# 霧抉茶（taiwantea.store）資訊安全評估與改善計畫

- **評估日期**：2026-07-04
- **評估對象**：production 站 `https://taiwantea.store/` 及本機程式碼 / server 架構
- **技術棧**：Next.js 16（App Router）+ Supabase（Postgres + RLS）+ Vercel + Cloudflare；金流 ECPay / Stripe / PayPal；CMS Sanity；Email Resend；AI 客服 Groq
- **評估方法**：純被動、唯讀。僅（1）閱讀原始碼與設定、（2）本機 `npm audit`、（3）對線上公開端點送唯讀 `HEAD`/`GET` 檢查回應標頭、（4）檢視本機 git 歷史。**全程未觸碰線上資料庫、未寫入任何資料、未提取任何用戶個資或密鑰內容。**

---

## 1. 總體結論

這是一個**安全基礎相當扎實**的專案。金流、授權、session、限流、安全標頭等核心防線都有正確且成熟的實作，明顯經歷過至少一輪安全稽核。

| 嚴重度 | 數量 | 項目 |
|--------|------|------|
| 🟠 High | 2 | Next.js 已知漏洞待升級、Admin 授權深度防禦不足 |
| 🟡 Medium | 3 | 超商回調反射型 XSS、RLS 線上現況待複查、審計來源可偽造 |
| 🔵 Low / 強化 | 8 | 相依套件、輸入驗證一致性、CSP、PII 保護等 |

> **關於憑證管理**：本次評估涵蓋憑證管理面，發現的問題已於評估後完成處置（相關密鑰全數輪換）。基於安全考量，該節的技術細節不列入本文件。

### 做得好、應維持的部分（先肯定）

- **金流非常穩健**：ECPay `CheckMacValue`、Stripe `constructEvent`、PayPal `verify-webhook-signature` 三方簽章驗證皆正確；金額一律**後端重算、完全不信任前端**；付款回調有**冪等性**（`.eq(payment_status,'pending')` 條件更新）與**原子性庫存扣減**，重放通知不會重複扣庫存或寄信。
- **用戶自有資源無 IDOR**：orders / bookings / points / participants / reviews 等路由一致採「cookie 驗證登入取得 `user.id` → service_role 查詢時強制 `user_id` 過濾或比對回 403」模式，抽查多條路由皆正確。
- **Admin session 設計良好**：隨機 `randomBytes(32)` token 存 DB、7 天過期、可撤銷、middleware 與 guard 皆 **fail-closed**、2FA（TOTP）已啟用。
- **限流持久化**：改用 Supabase 原子性 RPC，解決 serverless 多 instance 問題，且 **fail-open**（限流壞掉不擋正常客人）。
- **Cron 全數受 `CRON_SECRET` 保護**；webhook / revalidate 皆有密鑰驗證。
- **安全標頭完整（線上實測）**：nonce-based CSP、HSTS、`X-Frame-Options: DENY`、`nosniff`、Referrer-Policy、Permissions-Policy 齊備，`x-powered-by` 已隱藏。
- **contact 表單**有 email header injection 防護、subject 白名單、長度限制、限流。
- 密鑰未以 `NEXT_PUBLIC_` 前綴誤洩漏至前端。

---

## 2. 發現與改善計畫（依優先序）

### 🟠 H-1　Next.js 16.2.2 有多個已知高風險漏洞，可無痛升級

**現況**：`npm audit` 將 `next` 標為 **high**，當前 16.2.2 落在受影響範圍內，通報漏洞含多筆 **Middleware / Proxy bypass**、**CSP nonce XSS**、Server Components DoS、Image Optimization DoS、SSRF、cache poisoning 等。最新修補版 **16.2.10**（同 major，非破壞性）已修復。

**影響**：其中「Middleware / Proxy bypass」與本專案高度相關——本站的 Admin 授權**主要依賴 middleware（`src/proxy.ts`）**（見 H-2），一旦 middleware 可被繞過，未加內層驗證的 admin API 立即裸奔。「CSP nonce XSS」也直接對應本站採用的 nonce-based CSP。

**改善步驟**
```bash
npm install next@16.2.10
npm run build && npm run test   # 驗證無破壞
```
部署後於 Vercel Preview 冒煙測試再上正式。建議同時把 `next` 在 `package.json` 由 `^16.2.2` 收斂實測版本。

**工作量**：< 1 小時。

---

### 🟠 H-2　Admin API 授權僅靠 middleware 單層，缺深度防禦

**現況**：`/api/admin/*` 中約半數路由已用 `withAdminAuth()` 包裹（雙層），但至少 11 條路由**只匯出裸 handler、僅靠 `src/proxy.ts` middleware 攔截**，本身無任何授權檢查，包括：

| 路由 | 動作 | 若被繞過的後果 |
|------|------|----------------|
| `api/admin/orders` GET | 讀取**全部訂單** | 洩漏所有客戶姓名 / 電話 / 地址 / email |
| `api/admin/orders/[id]` GET/PATCH | 讀 / 改單筆訂單 | 個資外洩、竄改狀態 |
| `api/admin/points-adjustment` POST | 調整任意會員點數 | 無中生有發點數 |
| `api/admin/points-export` GET | 匯出點數紀錄 | 大量個資外洩 |
| `api/admin/coupons/[id]` PATCH/DELETE | 改折價券 | 竄改折扣金額 |
| `api/admin/campaigns`、`campaigns/[id]` | 行銷活動 CRUD | 竄改行銷設定 |
| `api/admin/members/[id]/tier-history` GET | 會員資料 | 個資外洩 |
| `api/admin/experience-sessions/[id]` PATCH | 場次 | 竄改 |
| `api/admin/experience-bookings/[id]/cancel` POST | 取消預約 | 竄改 |

搭配 H-1 的 middleware bypass 漏洞，這是一條**現實可行**的攻擊鏈，而非純理論。

**改善步驟**
1. 為**上述每一條** admin 路由補上 `withAdminAuth()`（模式已存在，照 `products/[id]/route.ts` 套用即可），使授權在 route handler 本身也成立——即使 middleware 失效仍 fail-closed。
2. 加一條測試 / CI 檢查：掃描 `src/app/api/admin/**/route.ts`，若匯出的 handler 未經 `withAdminAuth` 包裹則 fail，避免日後再漏。

**工作量**：約半天（逐檔包裹 + 補測試）。

---

### 🟡 M-1　超商地圖回調（cvs-callback）反射型 XSS

**現況**：`src/app/api/ecpay/cvs-callback/route.ts` 將回調傳入的 `CVSStoreName` / `CVSAddress` 透過 `JSON.stringify` 直接字串插值進 inline `<script>`：
```js
const html = `...<script>window.opener.postMessage(${payload}, '${base}');...`;
```
`JSON.stringify` **不會轉義 `</script>`**，且此回應的 CSP 為 `script-src 'unsafe-inline'`。攻擊者可先**無需登入**呼叫 `/api/ecpay/cvs-map` 取得一組有效簽名的 `MerchantTradeNo`（`verifyTradeNo` 只驗簽名與 10 分鐘時效），再於時效內自行 POST 至 `cvs-callback`，把 `CVSStoreName` 設為 `</script><script>…惡意…</script>` 突破標籤，在 `taiwantea.store` origin 下執行任意 JS。

**影響**：可誘導受害者觸發的反射型 XSS（跨站 form POST），可竊取非 httpOnly 資料、發起 CSRF、操控 postMessage。屬中風險（利用需誘騙受害者提交跨站表單）。

**改善步驟**（擇一）
- 對插入 script 的 JSON 做轉義：`JSON.stringify(payload).replace(/</g, '\\u003c')`，或
- 改為將資料放進 DOM `data-*` 屬性 / `textContent`，由 nonce 化的外部 script 讀取後再 `postMessage`，或
- 對 `storeName` / `address` 施加嚴格白名單（僅中英數與常見符號），並移除該回應的 `unsafe-inline`。

**工作量**：約 1 小時。

---

### 🟡 M-2　線上 RLS 現況需唯讀複查（尤其 orders 寫入政策）

**現況**：先前稽核紀錄（2026-06-25）指出 `orders` 表曾被多建 3 條危險的 `{public}` 寫入政策（允許登入者用 anon key 直接改 `payment_status='paid'` 免費取貨），並記載當日已 `drop policy` 修復。但**此為資料庫端狀態，無法從原始碼確認**，且評估過程遵守「不觸碰線上資料」原則未實際查詢。

**改善步驟**：於 Supabase SQL Editor 執行以下**唯讀**查詢，確認 `orders` 僅剩「SELECT 自己訂單」政策、無任何 anon/public 可寫入政策：
```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'orders'
order by cmd;

-- 一併確認所有表都已開 RLS
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
```
若發現殘留的 INSERT/UPDATE/DELETE 公開政策，立即 `drop policy`。

**工作量**：15 分鐘。

---

### 🟡 M-3　points-adjustment 的操作者身分（adminId）來自請求 body，可偽造

**現況**：`api/admin/points-adjustment` 的 `adminId` 直接取自 request body 而非 session。由於後台採單一共用 `ADMIN_PASSWORD`，session 未綁定特定管理員身分，導致點數調整的操作者紀錄可被任意填寫，削弱審計可信度。（此路由同時屬 H-2 的缺 `withAdminAuth` 名單。）

**改善步驟**：操作者身分改由伺服器端 session 推導，不接受前端傳入的 `adminId`；若未來有多位管理員，考慮讓每位管理員各自帳號登入（見下方長期建議）。

**工作量**：< 1 小時（併入 H-2 一起改）。

---

### 🔵 Low / 強化項目

| 編號 | 項目 | 說明與建議 | 工作量 |
|------|------|------------|--------|
| L-1 | 其餘 37 個相依套件漏洞 | 多為 Sanity 傳遞依賴或 dev-only（vite/esbuild/@babel/ws 等），生產暴露面小。`npm audit fix` 可修一批；Sanity 系需 major 升級（`sanity@5`、`next-sanity@9`），另行評估相容性後處理。 | 半天 |
| L-2 | 輸入驗證不一致 | `bookings/[id]/participants`（姓名 / **身分證** / 生日 / 緊急聯絡人）與 `reviews`（comment）、admin `coupons`/`campaigns` 的數值欄位缺長度 / 格式 / 範圍驗證，不若 `orders` 嚴謹。建議統一補上（防資料汙染與極端值）。 | 半天 |
| L-3 | 敏感 PII 保護 | `booking_participants` 儲存身分證字號、生日、緊急聯絡人。建議：確認該表 RLS 嚴格、評估欄位加密 / 遮罩、明訂保存期限與刪除機制（台灣個資法遵循）。 | 1 天 |
| L-4 | CSP 仍含 `unsafe-inline` | `script-src` 同時有 nonce 與 `'unsafe-inline'`；現代瀏覽器有 nonce 時會忽略 `unsafe-inline`，但舊瀏覽器仍 fallback。升級 Next 後測試移除 `unsafe-inline` 以強化。 | 半天 |
| L-5 | TOTP 無防重放 | 同一 6 碼在 30 秒窗口內可重放；`validate_admin_session` RPC 對 anon 開放且無限流（惟 token 為 256-bit 隨機，暴力不可行）。可加「已用碼」記錄與 RPC 限流強化。 | 半天 |
| L-6 | rate_limit RPC 權限 | `check_rate_limit` / `bump_rate_limit` 未明確 `REVOKE ... FROM anon, public`，目前靠 RLS 擋 anon 寫入，較脆弱。建議明確只授權 service_role。 | 15 分 |
| L-7 | sanity-webhook 用簡單密鑰 | 目前比對 `x-sanity-webhook-secret` 字串；Sanity 支援 HMAC 簽章（`sanity-webhook-signature`），改用簽章驗證更穩健。影響僅快取刷新，風險低。 | 1 小時 |
| L-8 | 上傳未驗 magic bytes | `upload-image` 僅信任 client 提供的 MIME / 副檔名（已有 admin 驗證 + 5MB 限制）。可加實際檔頭（magic bytes）比對，防偽裝檔案。 | 1 小時 |

---

## 3. 建議執行順序

- **P1（本週）**：H-1 升級 Next.js、H-2 補齊 admin 授權深度防禦、M-2 唯讀複查 RLS。三者合計約一天，且互相加乘（H-1+H-2 是同一條攻擊鏈的兩端）。
- **P2（兩週內）**：M-1 修 XSS、M-3 修審計來源、L-2 補輸入驗證、L-6 收斂 RPC 權限。
- **P3（一個月內，排程處理）**：L-1 相依套件、L-3 PII 保護、L-4 CSP 收緊、L-5 / L-7 / L-8 強化。

## 4. 長期架構建議

- **多管理員身分**：目前後台為單一共用密碼。若日後有多位管理者，改為個別帳號（可沿用 Supabase Auth + 角色）將使審計、權限撤銷、2FA 綁定都更清晰，也自然解決 M-3。
- **密鑰管理紀律**：確立「secret 只存 Vercel 環境變數、絕不進 git」的流程；可加 pre-commit hook（如 gitleaks）於提交前掃描。
- **相依套件維護**：將 `npm audit` 納入 CI，定期（如每月）升級，避免漏洞累積。

---

## 附錄：本次評估涵蓋範圍

已檢視：middleware / CSP、admin 認證與 session、2FA 流程、全部 admin API 授權、用戶自有資源 IDOR、三大金流簽章 / 金額重算 / 冪等性、cron / webhook / revalidate 保護、AI 客服限流與 prompt injection 面、檔案上傳、輸入驗證與注入 / XSS 面、RLS SQL 設計、相依套件漏洞、線上安全標頭、憑證管理、環境變數暴露面。

未涵蓋（需另行或有權限時進行）：線上 Supabase RLS 實際狀態（僅唯讀複查建議，見 M-2）、實際滲透測試 / 主動利用驗證、Vercel / Cloudflare / Supabase 平台端設定稽核、DNS / email SPF-DKIM-DMARC。
