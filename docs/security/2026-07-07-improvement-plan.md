# 霧抉茶 資安改善計畫（可執行工單）

- **日期**：2026-07-07　**配套診斷**：[`2026-07-07-security-assessment.md`](./2026-07-07-security-assessment.md)
- **定位**：這份文件是**執行清單**，不是報告。診斷（為什麼危險）在配套文件；這裡只講**怎麼修、怎麼驗**。

## 怎麼用這份文件

1. 從 **P0 由上往下**做，一次一項。每項都是**獨立工單**，不必回頭讀整份診斷。
2. 每項附**驗收條件**（可打勾、可驗證的句子）。做完跑一次驗收，過了才勾掉。
3. 標 **⚠️ 高風險區** 的（金流／庫存／auth／RLS／cron）：動手前先讀對應 `openspec/specs/` 規格，改完**必跑 `npm run test`**，並套用 `.claude/playbooks/judgment.md` 的高風險驗收（派 `checker` 或 `judge` 覆核）。
4. 標 **🔍 需先確認** 的：要先在 Supabase Dashboard／Vercel 後台看實際狀態才能決定怎麼修——**在 staging 做，不要在 production 實測**。
5. 交付紀律照 CLAUDE.md：**每完成一項就 commit + push**（沒 push＝不存在）。

## 優先級與時程總覽

| 階段 | 時程 | 內容 | 目標 |
|---|---|---|---|
| **P0** | 立即（數小時–1 天） | SEC-001、SEC-003、SEC-004、SEC-002（確認＋起手）、SEC-010、SEC-022 | 止血：關掉「單點繞過整層」的路徑 |
| **P1** | 本週 | SEC-005、SEC-006、SEC-007、SEC-008 ＋ P0 的回歸測試 | 補完高風險，加測試防回歸 |
| **P2** | 本月 | SEC-009、011、012、013、014、015、023、024、025 | 縱深防禦硬化 |
| **P3** | 持續／結構性 | SEC-016–021、026、027 ＋ 流程面（依賴治理、密鑰輪替、per-user admin、監控告警、staging 滲透） | 把安全變成長期制度 |

---

## P0 — 立即止血

### ☐ P0-1　修 admin 2FA 免密碼繞過（SEC-001）　⚠️ 高風險區（auth）
**為什麼最優先**：目前不需要管理密碼就能接管後台，這是整份報告可利用性最高的一項。

**修法**（兩個獨立缺口都要補）：
1. **`admin_pending` 改為伺服器端隨機 token**：在 `src/app/api/admin/auth/route.ts` 密碼驗證通過後（現 line 53-63），改為
   - `const pending = generateAdminSessionToken()`（沿用 `src/lib/admin-token.ts` 的隨機產生器）；
   - 寫入一張短期 pending 表（或沿用 `admin_sessions` 加 `stage='pending'` 欄位／或用 `rate_limits` 式的 KV），TTL 10 分鐘、標記「已過密碼」；
   - cookie 存這個 token（維持現有 `httpOnly/secure/sameSite:strict`）。
2. **`src/app/api/admin/auth/2fa/route.ts` 入場改為查 DB**：把 line 9-13 的 `pending !== "1"` 改成「拿 cookie token 去 DB 查是否存在、未過期、未消耗」；驗證成功後**消耗**該 pending token 再發 `admin_session`。
3. **為 2FA 端點加限流**：import `rateLimitPeek/rateLimitBump/rateLimitReset`（`@/lib/rate-limit`），比照 `auth/route.ts:9-12,18-23,38,44` 的模式，key 用 `admin-2fa:${ip}`，5 次/15 分鐘 ＋ 失敗 800ms 延遲，超限回 429。
4. （加分）TOTP replay 防護：記錄最後成功的 time step，拒絕重用。

**驗收條件**：
- ☐ 直接帶偽造 `Cookie: admin_pending=1`（未先過密碼）打 `POST /api/admin/auth/2fa` → **401**（token 不在 DB）。
- ☐ 對 2FA 端點連續 6 次錯誤 `code` → 第 6 次回 **429**。
- ☐ 正常流程（對密碼 → 拿 pending token → 對 TOTP）仍可成功登入。
- ☐ `npm run test` 全綠 ＋ 新增涵蓋上述三點的回歸測試。

**參考**：`openspec/changes/archive/2026-06-26-refactor-admin-session-2fa/`（前次 2FA 重構的設計脈絡）。**工時**：M（半天）。

---

### ☐ P0-2　升級 Next.js 修 middleware 繞過 CVE（SEC-003）　⚠️ 高風險區（授權層）
**為什麼優先**：後台授權只有 `proxy.ts` 一層，而這層所在版本可被公開 PoC 繞過。

**修法**：
- `package.json` 的 `next` 從 `^16.2.2` 提到 `^16.2.6`（≥16.2.6 同時涵蓋 Turbopack 的 follow-up 修補）；`npm install` 更新 lockfile。
- 跑 `npm run build`＋`npm run test`確認無破壞（Next patch 升級風險低，但 middleware 行為相關要看）。

**驗收條件**：
- ☐ `npm ls next` 顯示 ≥ 16.2.6。
- ☐ `npm audit` 不再列出 `GHSA-267c-6grr-h53f`／`GHSA-26hh-7cqf-hhc6`／`GHSA-492v-c6pp-mqqv` 等 middleware-bypass 公告。
- ☐ `npm run build` 成功、`npm run test` 全綠。
- ☐ 手動確認：未帶 `admin_session` 存取 `/admin/dashboard` → redirect 到 `/admin`；存取 `/api/admin/orders` → 401。

**工時**：S（1–2 小時）。

---

### ☐ P0-3　金流/點數後台 API 補上 `withAdminAuth`（SEC-004）　⚠️ 高風險區（auth）
**為什麼優先**：這是 P0-2 的補償控制——即使 middleware 被繞過，第二層仍擋得住；且補回稽核日誌。

**修法**：對下列每個 route 的每個 HTTP 方法，用 `withAdminAuth()` 包裝（`src/lib/admin-auth-guard.ts` 已有此 wrapper）。把
```ts
export async function PATCH(req: NextRequest, ctx) { ... }
```
改為
```ts
export const PATCH = withAdminAuth(async (req, ctx) => { ... }, "admin.orders.update");
```
（第二個參數是 audit action 名稱。）**清單**：
- `src/app/api/admin/orders/[id]/route.ts`（GET/PATCH）
- `src/app/api/admin/orders/route.ts`（GET）
- `src/app/api/admin/points-adjustment/route.ts`（POST）
- `src/app/api/admin/coupons/route.ts`（GET/POST）、`admin/coupons/[id]/route.ts`（PATCH）
- `src/app/api/admin/campaigns/route.ts`（POST）
- `src/app/api/admin/experience-bookings/[id]/cancel/route.ts`（POST）
- `src/app/api/admin/points-export/route.ts`（GET）
- 順手掃 `src/app/api/admin/**` 其餘 route，補齊所有漏網者。
- **額外強化**：`orders/[id]` 標記 `payment_status='paid'` 前，先查是否存在對應的已驗簽 webhook 記錄，不要單憑 request body。

**驗收條件**：
- ☐ 對上列每個端點發**未帶 `admin_session`** 的請求 → **401**。
- ☐ `rg "export (async function|const) (GET|POST|PATCH|PUT|DELETE)" src/app/api/admin` 對照，每個 admin route 都經 `withAdminAuth`。
- ☐ 正常後台操作仍可用，且 `admin_audit_logs` 有寫入紀錄。
- ☐ `npm run test` 全綠。

**工時**：M（半天，機械性）。

---

### ☐ P0-4　確認並修補敏感表 RLS（SEC-002／SEC-010）　⚠️ 高風險區（RLS）🔍 需先確認
**為什麼優先**：若 anon 可直讀寫，等於繞過全站授權——但**先確認再動手**，貿然開 RLS 可能讓現有查詢壞掉。

**步驟**：
1. **🔍 先確認（15 分鐘）**：Supabase Dashboard → Table Editor，逐一檢查下列表的 RLS 開關（有紅色警告＝未啟用）：
   - `booking_schema.sql`：`experience_types`、`experience_sessions`、`experience_bookings`、`booking_participants`
   - `points_system.sql` / `points_improvements.sql`：`member_tiers`、`user_membership`、`points_campaigns`、`coupon_templates`、`coupon_usages`、`tier_history`、`campaign_audit_log`、`points_expiry_events`
   - `admin_settings`（SEC-010，存 TOTP secret，**最優先**）、`orders`、`point_transactions`、`coupons`、`products`
2. **分類補 policy**（在 staging 先做，`supabase/` 下新增 migration）：
   - **僅伺服器寫入的表**（points/coupons/campaigns/admin_settings/tier_history/audit）：`ENABLE ROW LEVEL SECURITY` 後**不加 anon policy**＝只有 service_role 能存取（後台走 service_role，不受影響）。
   - **用戶要讀自己資料的表**（experience_bookings、booking_participants、user_membership）：`ENABLE RLS` ＋ `USING (auth.uid() = user_id)` 的 SELECT policy；寫入走 service-definer RPC。可參考 `sql/add_reviews_waitlist.sql` 的 `waitlist_entries`/`experience_reviews` 既有正確寫法。
3. 逐表開啟後，在 staging 跑一輪主要流程，確認沒有原本靠「無 RLS」硬讀的查詢被打斷（若有，該查詢應改走 service_role server route）。

**驗收條件**：
- ☐ Dashboard 中上列每張表 RLS 皆為 enabled。
- ☐ 用 anon key 直接查 `booking_participants` → 回 0 列或 permission denied（可在 staging 用 curl 對 Supabase REST 測）。
- ☐ staging 上完整走一遍下單/預約/點數流程，功能正常。
- ☐ `admin_settings` 確認 anon 無法讀取 `totp_secret`。

**工時**：L（1–2 天，含 staging 驗證）。**注意**：這是最需要小心的一項，開 RLS 可能連帶影響現有查詢，務必分表、逐一、在 staging 驗。

---

### ☐ P0-5　修 cvs-callback 反射型 XSS（SEC-022）　⚠️ 高風險區（金流周邊）
**修法**（`src/app/api/ecpay/cvs-callback/route.ts`）：
1. **防斷標籤**：把要嵌入 inline `<script>` 的 `payload` 跳脫危險字元——`JSON.stringify(...)` 後 `.replace(/</g, "\\u003c").replace(/\//g, "\\/").replace(/ /g,"\\u2028").replace(/ /g,"\\u2029")`。
2. **收回自我放寬的 CSP**：移除 line 31 的 `"Content-Security-Policy": "script-src 'unsafe-inline'"`；若仍需這個 inline script 執行，改為在此回應套一個一次性 nonce 並只允許該 nonce（不要整條 `unsafe-inline`）。
3. **前置端點加限流**：`src/app/api/ecpay/cvs-map/route.ts` 的 POST 加上 IP 限流（沿用 `@/lib/rate-limit`），降低自簽 tradeNo 的量產。

**驗收條件**：
- ☐ 對 `cvs-callback` 送 `CVSStoreName=</script><script>alert(1)</script>` → 回應中該字串以文字呈現，**無 script 執行**（可寫單元測試驗跳脫函式）。
- ☐ 回應不再含 `script-src 'unsafe-inline'`（或已改為 nonce）。
- ☐ `cvs-map` 超過限流閾值 → 429。
- ☐ 正常超商地圖選店流程仍可用。

**工時**：S–M（半天）。

---

## P1 — 本週

### ☐ P1-1　RPC 綁定呼叫者身分（SEC-005）　⚠️ 高風險區（RLS/點數）
**修法**（新增 `supabase/` migration）：把 `increment_annual_spend`（`points_system_rpc.sql:6-31`）改 `SECURITY DEFINER`、`SET search_path=public`，函式開頭加 `IF auth.uid() <> p_user_id THEN RAISE EXCEPTION ...`；並 `REVOKE EXECUTE ON FUNCTION increment_annual_spend FROM PUBLIC, anon;`（後台需要時另 `GRANT` 給 service_role 路徑）。同步檢查 `batch_annual_reset` 等其他 RPC 的 grant。
**驗收**：☐ anon 呼叫此 RPC 帶他人 `p_user_id` → 被拒；☐ 正常結帳累積年消費仍運作；☐ `npm run test` 全綠。**工時**：S–M。

### ☐ P1-2　點數/優惠券原子化，堵 double-spend（SEC-006）　⚠️ 高風險區（金流）
**修法**：
- 點數扣減改**單一原子 RPC**（在 DB 內鎖用戶列或用 `CHECK(balance>=0)` ＋ 條件式 UPDATE），取代 `src/lib/points.ts:216-234` 的 SELECT-then-INSERT。
- 優惠券核銷改條件式：`update({used_at, order_id}).eq("id", couponId).is("used_at", null)`，並檢查回傳 rowCount 是否為 1；且在**建立訂單前**先原子鎖定券。
- 四個 checkout 入口（ecpay/stripe/paypal/orders）**抽成共用函式**統一套用，別再各自複製。
**驗收**：☐ 併發測試：對同一張券/同一筆點數同時發 5 個結帳請求，只有 1 個成功折抵；☐ `npm run test` 全綠含新併發測試。**參考**：`supabase/points_system_rpc.sql` 既有原子 RPC 寫法。**工時**：M–L。

### ☐ P1-3　service_role client 移出前端（SEC-007）
**修法**：`src/app/admin/(protected)/members/[id]/points/page.tsx` 移除 line 5 的 `import { supabase }` 與 line 41-53 的直接查詢，改新增/改走 server route（比照**同檔 line 36** 的 `fetch("/api/admin/members/${userId}/tier-history")` 模式），server route 用 `withAdminAuth` 包起來。
**驗收**：☐ 該頁點數明細/餘額正常顯示（資料改由 server route 供給）；☐ `rg "@/lib/supabase" src/app/**/*page.tsx` 在 `"use client"` 檔案中零命中；☐ `npm run build` 成功。**工時**：S。

### ☐ P1-4　cron 密鑰比對改 fail-closed（SEC-008）
**修法**：6 個 `src/app/api/cron/*/route.ts` 的 `if (authHeader !== \`Bearer ${process.env.CRON_SECRET}\`)` 一律改為 `if (!process.env.CRON_SECRET || authHeader !== \`Bearer ${process.env.CRON_SECRET}\`)`。可抽成共用 `assertCronAuth(req)` helper。
**驗收**：☐ 暫時 unset `CRON_SECRET` 時，帶 `Authorization: Bearer undefined` 打任一 cron → 401；☐ 六個端點都改到；☐ `npm run test` 全綠。**工時**：S。

### ☐ P1-5　補齊 P0 的回歸測試
把 P0-1/P0-3/P0-5 的驗收情境寫成 `src/__tests__/` 下的自動化測試，確保未來不回歸。**驗收**：☐ 對應測試存在且綠。**工時**：M。

---

## P2 — 本月（縱深防禦硬化）

> 每項：一句修法 ＋ 驗收。動到金流/auth 的仍需 `npm run test`。

- **☐ P2-1 TOTP secret 加密存放（SEC-009）**：`admin_settings` 的 secret 欄位加應用層加密（如用一把 `TOTP_ENC_KEY` 做 AES-GCM）。驗收：DB 內 secret 為密文，登入 2FA 仍正常。
- **☐ P2-2 definer RPC 鎖 search_path（SEC-011）**：`increment_waitlist_count`/`decrement_waitlist_count`（`sql/add_reviews_waitlist.sql:72-88`）補 `SET search_path=public`。驗收：候補計數仍正常。
- **☐ P2-3 啟用訂單金額 CHECK（SEC-012）**：先跑 `points_system.sql:148-166` 的 backfill 校正舊資料，再 uncomment 啟用 `chk_order_total`（line 88-90）。⚠️ 金流，先在 staging。驗收：constraint 存在；既有訂單無違規；新單金額不符會被拒。
- **☐ P2-4 Docker 改非 root（SEC-013）**：`Dockerfile` production stage `CMD` 前加 `USER node`（必要時 `COPY --chown=node:node`）。驗收：`docker run ... whoami` 為 `node`；app 正常啟動。
- **☐ P2-5 匿名端點錯誤訊息一般化（SEC-014）**：`experiences/route.ts:21`、`experience-sessions/route.ts:47` 等 public 端點改回通用訊息，細節只 `console.error`。驗收：觸發錯誤時回應不含 table/column 名。
- **☐ P2-6 CSP 移除 `unsafe-inline`（SEC-015）**：`src/proxy.ts:9` 的 `script-src` 拿掉 `'unsafe-inline'`，GA/GTM 改用 nonce 或 hash。驗收：主要頁面在 console 無 CSP 違規、GA 仍上報。
- **☐ P2-7 JSON-LD 跳脫（SEC-023）**：`products/page.tsx:53-56`、`faq/page.tsx:43-63` 的 JSON-LD 輸出把 `<`→`<`、`/`→`\/`。驗收：含 `</script>` 的商品名不會斷標籤（單元測試）。
- **☐ P2-8 waitlist 數量驗證＋限流（SEC-024）**：`waitlist/route.ts:18` 比照 `bookings/route.ts:31` 加 `Number.isInteger && 1~N`；DB 補 `CHECK (participant_count >= 1)`；加限流。驗收：負數/超大值 → 400。
- **☐ P2-9 ChatWidget 不信任模型回傳 URL（SEC-025）**：`ChatWidget.tsx:107-134` 改用前端常數 `NEXT_PUBLIC_LINE_OFFICIAL_URL`，或白名單 `https://` scheme。驗收：模型回傳 `javascript:` 連結不會被渲染成可點的 href。

---

## P3 — 持續／結構性

**低風險單項清理**：
- **☐ P3-1（SEC-016）** `.gitignore`/`.dockerignore` 改 `.env*` ＋ `!.env.example`。
- **☐ P3-2（SEC-017）** ECPay CheckMacValue 改用 `crypto.timingSafeEqual` 常數時間比較。
- **☐ P3-3（SEC-018）** `points-adjustment` 的 `admin_id` 改由 server 端 session 推導，不收 client body。
- **☐ P3-4（SEC-019）** HSTS 加 `preload`（確認全站與子網域皆 HTTPS 後再送 preload list）。
- **☐ P3-5（SEC-020）** 確認未使用後 `npm uninstall @google/generative-ai`。
- **☐ P3-6（SEC-021）** 把 `orders`/`point_transactions`/`decrement_stock` 等 Dashboard-only 的 schema/RPC 補進 `supabase/` 版控；訂單編號改用有 UNIQUE 約束的產生方式。
- **☐ P3-7（SEC-026）** `POST /api/reviews` 加限流。
- **☐ P3-8（SEC-027）** `points-export` CSV 對 `=+-@` 開頭欄位前綴 `'`。

**流程與制度（把安全變成習慣，而非一次性專案）**：
- **☐ P3-9 依賴治理**：CI 加 `npm audit --audit-level=high`（或 Dependabot/Renovate），讓框架 CVE（如這次的 Next）能第一時間被發現，而非等資安評估。
- **☐ P3-10 密鑰輪替**：`ADMIN_PASSWORD`、service_role key、各金流密鑰定期輪替；建立外洩時的輪替 runbook。
- **☐ P3-11 per-user admin 帳號**：把單一共用 `ADMIN_PASSWORD` 升級為每人一組帳號＋各自 2FA，讓稽核日誌（`admin_audit_logs`）能歸屬到人、可個別撤銷。
- **☐ P3-12 稽核與監控**：擴大 `withAdminAuth` 的 audit 覆蓋到所有寫入操作；把現有的 `points-anomaly-scan` cron（事後偵測）接上實際告警（email/LINE 通知 `ADMIN_EMAIL`），並補上「單日合計 < 500 點」盲區。
- **☐ P3-13 staging 滲透測試**：本次是白箱靜態審查；建議在 staging 另做一輪動態滲透測試（尤其 P0/P1 修完後驗證 SEC-002 的 RLS 實際生效）。

---

## 驗證與交付流程（每項工單通用）

1. **改前**：高風險區先讀對應 `openspec/specs/`；跑一次 `npm run test` 記基準。
2. **改後**：跑 `npm run test`（全綠、無新增 skip）；行為驗證用 `verify` skill 或針對性 curl；diff 品質用 `code-review` skill。
3. **高風險項**（金流/庫存/auth/RLS/cron）：另派 `checker`（讀 diff 逐條比對驗收條件）或 `judge`（第二意見），照 `.claude/playbooks/judgment.md`。
4. **需線上驗證**的 RLS/env 項目：在 **staging** 驗，不在 production 實測。
5. **commit + push**：每完成一項就推（沿用 `feat:|fix:|test:` ＋ 繁中描述的慣例）。

---
*本計畫依 2026-07-07 靜態評估產出。SEC-002／010 等標「🔍 需先確認」者，其最終修法取決於 Dashboard 實際狀態；請以確認結果為準調整。*
