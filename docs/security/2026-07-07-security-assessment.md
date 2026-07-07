# 霧抉茶（taiwantea.store）Production 資訊安全評估報告

- **日期**：2026-07-07
- **範圍**：正式營運站的 server 架構與程式架構（Next.js 16 App Router / Supabase / Sanity / Stripe・PayPal・ECPay 綠界金流 / Vercel 部署）
- **性質**：白箱程式碼與設定審查（static code review），**非**黑箱滲透測試
- **配套文件**：可行改善計畫見 [`2026-07-07-improvement-plan.md`](./2026-07-07-improvement-plan.md)（本報告只診斷，計畫負責怎麼修）

---

## 0. 約束聲明（先講清楚我們沒碰什麼）

本次評估**全程唯讀靜態分析**，嚴格遵守「不動線上資料、不碰用戶隱私」：

- ✅ 只讀取原始碼、設定檔、SQL schema 檔（版控內容）。
- ✅ **未連線 production 資料庫**、**未讀取或匯出任何一筆用戶資料**、**未觸發任何金流／寄信／cron／webhook**、**未執行任何 migration**、**未改動線上任何狀態**。
- ✅ 對外網路僅用於：查證 Next.js 官方文件與 CVE 公告、`npm audit` 讀取相依套件公告（皆不涉及本站資料）。

**代價與界線**：因此凡是「只能在 Supabase Dashboard 或 Vercel 後台才看得到的實際狀態」（例如某張表的實際 anon 權限、環境變數是否真的設了值），本報告只能**指出風險與判斷條件**，無法替站方確認。這類項目集中列在 [§6 需站方自行確認](#6-需站方自行確認唯讀無法驗證的項目)，請在 staging 或後台自行核對，**不要為了驗證而在 production 動手實測**。

---

## 1. 執行摘要（給老闆的 60 秒版）

**整體判斷：核心金流的工程品質相當好，但外圍的存取控制有幾個「單點就能被整組繞過」的破口，需要盡快止血。**

先講好的一面（這些**別動壞了**）：三家金流（Stripe/PayPal/ECPay）的 webhook **都有正確驗簽、都有防重放**；結帳金額一律**伺服器端重算**、不信任前端；後台 session 已改用**隨機、可撤銷、會過期**的 token（舊的「HMAC(密碼)」漏洞已修）；安全 header（HSTS、X-Frame-Options、nonce CSP…）到位；**無 SQL 注入、無 committed 密鑰、無可利用的開放重導**。這是一個有人用心顧過安全的系統。

再講要處理的一面。本次共 **27 項發現：3 Critical、6 High、10 Medium、8 Low/Info**。三個 Critical 是本報告的重點，共同特徵是「**繞過一個點，就等於繞過整層防線**」——正是單一掃描器抓不到、要把整台機器讀進腦子裡才看得出的組合風險：

1. **後台 2FA 可免密碼繞過**（SEC-001）：進入 2FA 驗證頁的憑證只是一個**內容固定為 `"1"` 的 cookie**，任何人都能自己帶；而 2FA 驗證端點**完全沒有限流**，6 位數 TOTP 可被窮舉。合起來，攻擊者**不需要知道管理密碼**就能取得後台完整控制權。

2. **十餘張敏感資料表可能未設 RLS**（SEC-002）：預約系統（含**身分證字號、生日、緊急聯絡人**）與整個會員點數／優惠券系統的多張表，在版控 SQL 裡都沒有啟用 Row Level Security。若 Supabase 專案沿用常見預設權限，這些表可被**公開的 anon key 直接讀寫**，繞過應用層所有授權檢查。（此項可利用性取決於 Dashboard 內實際權限設定，請**列為最優先確認**。）

3. **Next.js 版本有 live 的 middleware 繞過漏洞**（SEC-003）：整個後台授權**只押在 `src/proxy.ts` 這一層 middleware**，而目前鎖定的 `next@16.2.2` 正好命中一個**已公開 PoC 的官方 middleware/proxy 繞過 CVE**（CVE-2026-44575，修補版本 16.2.5+）。這代表那唯一一層防線本身可被特製路徑繞過——一旦繞過，就直達那些**漏掛第二層 guard** 的金流／點數後台 API（SEC-004）。

**好消息是：這些幾乎全是「補一段檢查」等級的修法，不是打掉重練。** 診斷最貴，修起來多半是小改動。改善計畫已按 P0（立即止血）到 P3（結構性）排好優先序，可一項一項交付執行。

### 風險總覽表

| ID | 嚴重度 | 領域 | 標題 | 一句話影響 |
|---|---|---|---|---|
| SEC-001 | 🔴 Critical | Auth/2FA | 後台 2FA 可免密碼繞過（偽造 pending cookie＋2FA 端點無限流） | 無需管理密碼即可完整接管後台 |
| SEC-002 | 🔴 Critical | RLS/隱私 | 12+ 敏感表未設 RLS（含身分證字號等個資） | 若 anon grants 為預設，個資與金流資料可被公開 key 直接讀寫 |
| SEC-003 | 🔴 Critical | 框架/授權 | `next@16.2.2` 命中 middleware 繞過 CVE（授權單層） | 唯一的後台授權層可被特製路徑繞過 |
| SEC-004 | 🟠 High | 授權 | 金流/點數後台 API 漏掛 `withAdminAuth` | 與 SEC-003 疊加＝匿名偽造付款/灌點數/自製優惠券 |
| SEC-005 | 🟠 High | RLS/RPC | `increment_annual_spend` RPC 未綁呼叫者身分 | 可竄改他人年度消費與會員等級 |
| SEC-006 | 🟠 High | 金流 | 優惠券/點數 TOCTOU race，可 double-spend | 平行請求重複折抵同一券/同一筆點數 |
| SEC-007 | 🟠 High | RLS/前端 | service_role client 被引入 `"use client"` 元件 | RLS-bypass 意圖出現在瀏覽器端（頁面會壞/依賴缺失的 RLS） |
| SEC-010 | 🟠 High | Auth | `admin_settings`（存 TOTP secret）RLS 狀態不明 | 若無 RLS，anon 可直讀 TOTP secret → 2FA 全面失效 |
| SEC-022 | 🟠 High | XSS | `ecpay/cvs-callback` 反射型 XSS＋自我放寬 CSP | 可在站台 origin 執行任意 JS |
| SEC-008 | 🟡 Medium | Cron | cron `CRON_SECRET` 比對 fail-open（env 未設時） | 未設密鑰的環境可被 `Bearer undefined` 觸發排程 |
| SEC-009 | 🟡 Medium | Auth | TOTP secret 明碼存放 | DB 讀取權一旦外洩即可複製 2FA |
| SEC-011 | 🟡 Medium | RPC | 兩個 definer RPC 未鎖 `search_path` | search_path 注入的理論風險 |
| SEC-012 | 🟡 Medium | 金流 | 訂單金額恆等式 CHECK 被註解未啟用 | DB 層缺最後一道金額防線 |
| SEC-013 | 🟡 Medium | 基建 | Docker image 以 root 執行 | 應用層 RCE 時放大容器內權限 |
| SEC-014 | 🟡 Medium | 資訊洩漏 | 匿名端點回傳原始 DB/例外錯誤 | 洩漏 schema 細節助攻擊者踩點 |
| SEC-015 | 🟡 Medium | CSP | `script-src` 同時有 nonce 與 `'unsafe-inline'` | 舊瀏覽器下 nonce 防護被稀釋 |
| SEC-023 | 🟡 Medium | XSS | JSON-LD `dangerouslySetInnerHTML` 未跳脫 `</script>` | 具後台/CMS 寫入權者可注入 |
| SEC-024 | 🟡 Medium | 輸入驗證 | `waitlist` 數量欄無範圍驗證＋無限流 | 破壞候補 FIFO 公平性 |
| SEC-025 | 🟡 Medium | XSS | ChatWidget 直接渲染 LLM 回傳的 URL | prompt injection 可導向 `javascript:` URI |
| SEC-016 | ⚪ Low | 基建 | `.gitignore`/`.dockerignore` 未蓋 `.env.production` 等 | 未來誤加該檔會被提交 |
| SEC-017 | ⚪ Low | 金流 | ECPay CheckMacValue 用非常數時間比較 | timing side-channel（實務風險極低） |
| SEC-018 | ⚪ Low | 稽核 | `points-adjustment` 的 adminId 由 client body 提供 | 稽核歸屬可偽造 |
| SEC-019 | ⚪ Low | Header | HSTS 缺 `preload` | 首次連線的降級空間 |
| SEC-020 | ⚪ Info | 相依 | dead dependency `@google/generative-ai` | 擴大攻擊面（未使用） |
| SEC-021 | ⚪ Info | 金流 | 訂單編號用 `Date.now()`；基底表約束不在版控 | 無法靜態確認唯一性 |
| SEC-026 | ⚪ Low | 限流 | `POST /api/reviews` 無限流 | 濫用空間有限但缺一致性 |
| SEC-027 | ⚪ Low | 資料匯出 | CSV 匯出未防公式注入 | 欄位來源受控，風險低 |

---

## 2. 範圍、方法與未涵蓋

**已評估**：
- Server／基建：`next.config.ts`、`src/proxy.ts`（Next 16 middleware）、`vercel.json`（cron）、`Dockerfile`、`docker-compose.yml`、`.env.example`、`.gitignore`/`.dockerignore`、相依套件（`npm audit`）。
- 程式架構：`src/app/api/**`（約 63 個 route handler）、`src/app/admin/**`、`src/lib/**`、`src/components/**`、`src/sanity/**`。
- 資料層：`supabase/*.sql`、`sql/*.sql`（RLS policy、RPC、schema migration）。
- 領域分工：認證/授權/2FA/RLS、金流與金額完整性、密鑰/設定/cron/資訊洩漏、輸入驗證/注入/上傳/XSS/限流。

**方法**：人工讀碼為主，`git grep`／`rg` 交叉比對輔助；跨域組合風險由主審統整；三個爭議最大或最高風險的發現（SEC-001、SEC-004、SEC-007、SEC-022）逐一以原始碼親自覆核；SEC-003 的框架版本與 CVE 以官方安全公告查證。

**未涵蓋（後續建議）**：
- 動態滲透測試、DAST、fuzzing（與「不動 production」原則衝突，建議在 staging 另案進行）。
- 需連線才能確認的 Supabase 實際權限與 Vercel 環境變數實值（見 §6）。
- 基底資料表（`orders`/`point_transactions`/`coupons`/`products`/`admin_settings`）的完整 schema——這些只有增量 migration 進版控，建表 SQL 不在 repo，限制了 RLS/約束的可驗證範圍。

---

## 3. 架構與信任邊界

```
公網
  │
  ▼
[Vercel Edge]──► src/proxy.ts (Next 16 middleware，Node runtime)
  │                • 產生 nonce、設定 CSP
  │                • i18n locale rewrite（/en）
  │                • Admin 閘：/admin/*、/api/admin/* 驗 admin_session（RPC，fail-closed）
  │                • ⚠️ 這是後台授權的「唯一」一層（SEC-003/004 的關鍵）
  ▼
[Next.js App Router]
  ├── 頁面 / Server Component（SSR）
  ├── API route handlers（src/app/api/**）── mutation 皆走這裡，無 server action
  │     ├─ 公開端點（商品、體驗、聊天、cvs-map…）
  │     ├─ 用戶端點（訂單、預約、點數、評價；抽查皆有 user_id 歸屬檢查）
  │     ├─ 後台端點（/api/admin/**；部分漏掛 withAdminAuth＝SEC-004）
  │     ├─ 金流 webhook（Stripe/PayPal/ECPay；驗簽正確）
  │     └─ cron（/api/cron/**；驗 CRON_SECRET，惟 fail-open＝SEC-008）
  ▼
[Supabase Postgres]
  • anon key：走前端／middleware（受 RLS 約束——若 RLS 有設）
  • service_role key：僅 src/lib/supabase.ts，繞過 RLS（誤入前端＝SEC-007）
  • ⚠️ RLS 是最後一道防線；多張敏感表疑似未啟用（SEC-002）
```

**五條攻擊面（信任邊界）**：
1. 公網 → middleware（CSP／admin 閘／locale）
2. 瀏覽器（持 anon key、可任意竄改請求）→ API route
3. 外部回調（金流/Sanity webhook、cron 觸發）→ 對應 route（靠密鑰/簽章區分可信）
4. API → Supabase（RLS 為最後防線；service_role 會繞過它）
5. 用戶／CMS 內容 → 渲染（XSS 面）

**本次最危險的組合**發生在邊界 1＋4：後台授權押在**單一** middleware（邊界 1），該 middleware 所在的 Next 版本有繞過 CVE，而繞過後直達的後台 API 又漏掛第二層 guard，且其資料操作用 service_role **繞過邊界 4 的 RLS**——三個獨立的弱點串成一條可從公網直通資料庫寫入的路徑。

---

## 4. 發現詳述

> 每項含：位置、說明、可利用情境、修法方向。具體修法步驟與驗收條件見改善計畫文件。

### 🔴 Critical

#### SEC-001 — 後台 2FA 可免密碼繞過（偽造 pending cookie ＋ 2FA 端點無限流）
- **位置**：`src/app/api/admin/auth/2fa/route.ts:9-13`（入場檢查）、全檔（無限流）；`src/app/api/admin/auth/route.ts:56-63`（設定 pending cookie）；`src/proxy.ts:90-95`（此路徑不受 session 保護）。
- **說明**：`/api/admin/auth/2fa` 的唯一入場檢查是 `admin_pending` cookie 是否等於字串 `"1"`。這個值是**常數、非簽章、不綁定任何一次密碼驗證事件**；`httpOnly` 只能防 JS 讀取，擋不住攻擊者用 curl 主動帶上 `Cookie: admin_pending=1`。更關鍵的是，此端點**完全沒有限流**（對照密碼端點 `auth/route.ts` 有「5 次/15 分鐘＋800ms 延遲＋timingSafeEqual」的完整防護），6 位數 TOTP 僅 100 萬組合，可高並發窮舉。
- **可利用情境**：攻擊者略過密碼步驟，直接自帶 `admin_pending=1`，對 2FA 端點窮舉 `code`，命中即取得一枚有效 7 天的正式 `admin_session`。**全程不需要知道 `ADMIN_PASSWORD`。**
- **脈絡**：git 歷史顯示團隊已修過「舊版 `admin_session=HMAC(密碼)`」的漏洞，但該修復未涵蓋此獨立破口——本破口甚至比舊的更嚴重（連密碼都不需要）。
- **修法方向**：`admin_pending` 改為與密碼驗證事件綁定的**伺服器端隨機短期 token**（比照 `admin_sessions` 模式）；為 2FA 端點加上 DB-backed 限流（以 IP＋pending token 計數）；補 TOTP replay 防護（記錄已用 time step）。

#### SEC-002 — 12+ 敏感資料表未啟用 RLS（含身分證字號等個資）
- **位置**：`supabase/booking_schema.sql`（`experience_types`/`experience_sessions`/`experience_bookings`/`booking_participants`）、`supabase/points_system.sql` 與 `supabase/points_improvements.sql`（`member_tiers`/`user_membership`/`points_campaigns`/`coupon_templates`/`coupon_usages`/`tier_history`/`campaign_audit_log`/`points_expiry_events`）——這些檔案中**均無 `ENABLE ROW LEVEL SECURITY` 語句**。
- **說明**：`booking_participants` 含**身分證字號、出生日期、緊急聯絡人**；`experience_bookings` 含姓名/電話/email/金額；`user_membership`/`coupon_templates` 直接關係金流。Supabase 的慣例是：一張表若**關閉 RLS 又被 PostgREST 曝露**，存取就退回由 SQL GRANT 決定，而 anon/authenticated 角色在多數 Supabase 專案預設是有 table 權限的——這正是 Dashboard 對「RLS 未啟用」跳紅色警告的原因。
- **可利用情境**：持公開 anon key（前端本就看得到）直接打 Supabase REST，繞過本站應用層**全部**授權檢查：讀出所有預約者個資；寫 `user_membership` 自升 gold 等級（20% 折扣）；寫 `coupon_templates` 自建高額折價券。應用層那些正確的 `user_id` 檢查，只在「走本站 API」時有效，改走 Supabase REST 就完全不觸發。
- **可利用性條件**：取決於 Supabase 專案內 `anon`/`authenticated` 的實際 grants。**唯讀無法確認**——但因潛在影響是 PII 外洩＋金流詐欺，且「RLS 關閉＝anon 可存取」是常見預設，本報告列為 Critical 並請**最優先於 Dashboard 確認**。
- **修法方向**：逐表 `ENABLE ROW LEVEL SECURITY` ＋最小權限 policy（一般用戶僅能 SELECT 自己的列，寫入一律走 service_role／security-definer RPC）。

#### SEC-003 — `next@16.2.2` 命中 middleware/proxy 繞過 CVE（授權只有單層）
- **位置**：`package.json`（`"next": "^16.2.2"`）、`package-lock.json`（鎖定 16.2.2）；受影響的授權層為 `src/proxy.ts`。
- **說明**：本站後台授權**完全依賴** `src/proxy.ts` 這一層 middleware。而 `next@16.2.2` 命中官方安全公告 **CVE-2026-44575 / GHSA-267c-6grr-h53f**（App Router 的 middleware/proxy bypass via segment-prefetch/`.rsc` 變體路徑；影響 `>=16.0.0 <16.2.5`，修補 16.2.5；使用 Turbopack 者需 16.2.6，因 follow-up CVE-2026-45109 的不完整修補）。CVSS 7.5，且已有公開 PoC 集。`npm audit` 另回報同版本共 9 High/25 Moderate。
- **可利用情境**：以特製 `.rsc`／segment-prefetch 路徑讓請求**繞過 proxy.ts 的 admin 閘**，直達底層 route。對有第二層 `withAdminAuth` 的 route 仍會被擋；但對**漏掛 guard** 的 route（SEC-004）就等於無認證直達。
- **修法方向**：升級 `next` 至 ≥16.2.6，`npm run test` ＋ `npm run build` 驗證，並實測 admin 路由防護仍生效。**同時**執行 SEC-004（雙層防護，互為對方失效時的補償）。

### 🟠 High

#### SEC-004 — 金流/點數後台 API 漏掛 `withAdminAuth`
- **位置**（皆缺 `withAdminAuth`，且用 service_role client `src/lib/supabase.ts:7`）：`src/app/api/admin/orders/[id]/route.ts`（PATCH，親自覆核確認無 guard）、`admin/orders/route.ts`（list，dump 全站訂單 PII）、`admin/points-adjustment/route.ts`、`admin/coupons/route.ts` 與 `coupons/[id]/route.ts`、`admin/campaigns/route.ts`、`admin/experience-bookings/[id]/cancel/route.ts`、`admin/points-export/route.ts`。對照有掛 guard 的 `admin/products/[id]`、`admin/reviews/[id]`、`admin/upload-image`，證明是「漏掛」而非設計。
- **說明**：平時這些 route 受 `src/proxy.ts:107-135` 的 middleware 保護（驗 `admin_session`，fail-closed）——**所以目前並非可匿名利用**（此處修正了初審時「無 middleware」的誤判：`src/proxy.ts` 就是 Next 16 的生效 middleware）。但問題有二：(1) 與 SEC-003 疊加時，middleware 一旦被繞過，這些 route 就無任何防線；(2) 這些操作**不會寫入 `admin_audit_logs`**（稽核盲區）。`orders/[id]` PATCH 尤其危險：可將訂單標成 `paid`／`completed` 觸發發點，或標 `cancelled` 觸發優惠券復原＋點數退還＋庫存回補。
- **修法方向**：逐一以 `withAdminAuth()` 包裝（比照 `admin/products/[id]`）；`orders/[id]` 標記 `paid` 前應要求存在對應的已驗簽 webhook 記錄，而非單純信任 request body。

#### SEC-005 — `increment_annual_spend` RPC 未綁定呼叫者身分
- **位置**：`supabase/points_system_rpc.sql:6-31`。
- **說明**：此 RPC 為 invoker 權限（非 security definer）、接受任意 `p_user_id` 參數、函式內**無呼叫者身分檢查**，且全庫找不到 `REVOKE EXECUTE`。Postgres 對新函式預設 `GRANT EXECUTE TO PUBLIC`。
- **可利用情境**：若 anon/authenticated 可直接呼叫此 RPC（疊加 `user_membership` 無 RLS＝SEC-002），可帶任意 `p_user_id` 竄改他人年度消費，進而影響會員等級與折扣。
- **修法方向**：改 security definer 並在函式內驗證 `auth.uid() = p_user_id`；明確 `REVOKE EXECUTE ... FROM PUBLIC, anon`。

#### SEC-006 — 優惠券／點數 TOCTOU race，可 double-spend
- **位置**：`src/lib/coupons.ts:22-30`（check）與四個 checkout 入口（`ecpay/checkout`、`stripe/checkout`、`paypal/create-order`、`orders/route.ts`）的核銷（`update` 無條件式 WHERE）；`src/lib/points.ts:41-113,216-234`（SELECT-then-INSERT，無原子鎖）。
- **說明**：優惠券核銷是 `update({used_at,...}).eq("id",couponId)`，缺 `.is("used_at", null)` 的條件；點數扣減是分離的查詢再 INSERT，中間無交易鎖或原子 RPC。**旁證**：同專案 `increment_annual_spend` 特意用原子 RPC 並註明「避免 race condition」，證明團隊知道該這樣做，但點數餘額與優惠券沒跟上。`points-anomaly-scan` cron 只是**事後偵測**且有盲區（單日合計壓在 500 點下即不觸發）。
- **可利用情境**：已登入用戶以平行請求，讓單張優惠券或有限點數餘額被折抵到多筆訂單。
- **修法方向**：點數改單一原子 RPC（鎖用戶列或 `CHECK(balance>=0)`＋原子條件 UPDATE）；優惠券核銷改條件式 UPDATE 並檢查是否真的更新到、且在**建立訂單前**先原子鎖定；四個結帳入口統一套用（目前是四份近乎複製貼上的邏輯）。

#### SEC-007 — service_role client 被引入 `"use client"` 元件
- **位置**：`src/app/admin/(protected)/members/[id]/points/page.tsx:1,5,41-53`；client 定義於 `src/lib/supabase.ts:7`。
- **說明**：此頁是 `"use client"` 元件，卻直接 import 並在瀏覽器端呼叫用 `SUPABASE_SERVICE_ROLE_KEY` 建立、可繞過 RLS 的 client。**需要澄清的是：這不是金鑰外洩**——Next.js 只會把 `NEXT_PUBLIC_*` 環境變數 inline 進 client bundle，`SUPABASE_SERVICE_ROLE_KEY` 在瀏覽器端會是 `undefined`，金鑰字面值不會明碼出現。但這段程式碼的**意圖**是在瀏覽器用 RLS-bypass 權限查會員點數表，屬架構錯誤：實際執行時 client 無有效金鑰，若該頁「還能查到資料」，反而代表底層 `point_transactions` 表缺 RLS（＝SEC-002）。
- **修法方向**：移除這兩處直接呼叫，改走 server route（比照**同一檔案 line 36** 已寫對的 `fetch("/api/admin/members/.../tier-history")` 模式）。

#### SEC-010 — `admin_settings`（存 TOTP secret）的 DDL/RLS 不在版控
- **位置**：全 repo 與 git 全歷史皆無此表的 `CREATE TABLE`。
- **說明**：此表存放 `totp_secret`（見 `2fa/route.ts:20-25` 讀取）。若此表也未啟用 RLS，anon 可直接讀出 TOTP secret，比 SEC-001 的窮舉更直接地讓 2FA 全面失效。
- **可利用性條件**：無法靜態確認（表不在版控）。列為 High 並請**優先於 Dashboard 確認**。
- **修法方向**：確認並補上 RLS（此表應僅 service_role 可存取）。

#### SEC-022 — `ecpay/cvs-callback` 反射型 XSS ＋ 路由自我放寬 CSP
- **位置**：`src/app/api/ecpay/cvs-callback/route.ts:14-16,19-26,31`；前置端點 `src/app/api/ecpay/cvs-map/route.ts:32-41,64-85`。
- **說明**：`CVSStoreName`/`CVSAddress` 原樣取自 POST body，經 `JSON.stringify()`（**不會跳脫 `</script>` 或 `<`**）直接插入 inline `<script>`；且此回應**自行**把 CSP 覆寫成 `script-src 'unsafe-inline'`（無 nonce，等於解除全站 CSP 保護）。`verifyTradeNo` 只驗 `MerchantTradeNo` 的 HMAC 簽章，不驗其餘欄位真的來自 ECPay；而 `cvs-map` 端點**公開、免登入、無限流**，任何人可自簽一枚有效 10 分鐘的 `MerchantTradeNo`。
- **可利用情境**：攻擊者先向 cvs-map 取得合法 tradeNo，再誘使受害者的瀏覽器（如自動送出的跨站表單）POST 到 cvs-callback，`CVSStoreName` 帶入含 `</script>` 斷標籤的 payload；回應在受害者瀏覽器渲染時，注入的 script 因該路由允許 `unsafe-inline` 而在 **taiwantea.store origin 下執行**。
- **修法方向**：輸出前把 `<` 轉為 `<`（並跳脫 `/`）以防斷標籤；**移除此路由自訂的寬鬆 CSP**，改用全站 nonce CSP；為 `cvs-map` 加上限流；並考慮驗證 callback 欄位確實來自 ECPay。

### 🟡 Medium

- **SEC-008 cron `CRON_SECRET` fail-open**：6 個 cron route 同構寫法 `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``（例 `src/app/api/cron/reset-annual-spend/route.ts:8-11`）。若某部署環境（如 Vercel Preview）未設 `CRON_SECRET`，比對退化成固定字串 `"Bearer undefined"`，攻擊者送 `Authorization: Bearer undefined` 即可觸發寫入正式 DB 的排程（Preview 常與正式共用 Supabase 專案）。修：改 fail-closed，六檔一起。（對照 `REVALIDATE_SECRET`/`SANITY_WEBHOOK_SECRET` 端點寫法正確、fail-closed。）
- **SEC-009 TOTP secret 明碼存放**：`src/app/api/admin/2fa/setup/route.ts:30-32`。修：欄位加應用層加密。
- **SEC-011 definer RPC 未鎖 search_path**：`increment_waitlist_count`/`decrement_waitlist_count`（`sql/add_reviews_waitlist.sql:72-88`），與正確示範 `admin_sessions.sql:26`（`SET search_path=public`）不一致。修：補鎖。
- **SEC-012 訂單金額恆等式 CHECK 被註解**：`supabase/points_system.sql:88-90`。修：跑完既有 backfill script 校正舊資料後啟用 constraint。
- **SEC-013 Docker image 以 root 執行**：`Dockerfile` 四個 stage 皆無 `USER`。修：production `CMD` 前加 `USER node`。
- **SEC-014 匿名端點回傳原始 DB/例外錯誤（CWE-209）**：`src/app/api/experiences/route.ts:21`、`src/app/api/experience-sessions/route.ts:47`（匿名可觸發，風險最高）；另有 20+ 處在驗證後觸發風險較低。修：public 端點一律回通用訊息，細節只進 `console.error`。
- **SEC-015 CSP 混用 nonce 與 `'unsafe-inline'`**：`src/proxy.ts:9`。符合 CSP3 的瀏覽器會因 nonce 忽略 `unsafe-inline`，但舊瀏覽器退回接受 inline，稀釋 nonce 防護。修：移除 `'unsafe-inline'`，GA/GTM 改用 nonce 或 hash。
- **SEC-023 JSON-LD XSS**：`src/app/products/page.tsx:53-56`（`products` 表內容）、`src/app/faq/page.tsx:43-63`（Sanity 內容），`JSON.stringify` 未跳脫 `<`/`/`；需後台/CMS 寫入權才能觸發，且部分被 nonce CSP 緩解，故 Medium。修：輸出前 `/` 換 `\/`、`<` 換 `<`。（首頁 `page.tsx:65-72` 為靜態內容，無風險。）
- **SEC-024 `waitlist` 缺數量驗證＋無限流**：`src/app/api/waitlist/route.ts:18` 僅 truthy 檢查，負數/小數/超大值可過（對照 `bookings/route.ts:31` 有 `Number.isInteger && 1~50`）；DB 亦缺 CHECK。負數 `participant_count` 破壞候補 FIFO（`src/lib/waitlist.ts:22`）；但轉正式預約時會撞 `experience_bookings` 的 CHECK 而失敗，故**不會產生負金額訂單**，衝擊限於隊列邏輯。修：補整數範圍檢查＋DB CHECK＋限流。
- **SEC-025 ChatWidget 渲染 LLM 回傳的 URL**：`src/components/ChatWidget.tsx:107-134` 直接把模型回覆中 `[LINE_CONTACT](...)` 的字串設為 `<a href>`，未檢查 scheme。prompt injection 若誘使模型輸出 `javascript:` URI，點擊即在 origin 執行 JS。修：改用前端常數 `NEXT_PUBLIC_LINE_OFFICIAL_URL`，不信任模型回顯的網址。

### ⚪ Low / Informational

- **SEC-016**：`.gitignore`/`.dockerignore` 未涵蓋 `.env.production`/`.env.development`/`.env.test`（目前無此檔，屬潛在缺口）。修：改用 `.env*` ＋ `!.env.example` 白名單。
- **SEC-017**：ECPay CheckMacValue 用 `===` 非常數時間比較（`ecpay/return/route.ts`）。實務可利用性極低。
- **SEC-018**：`points-adjustment` 的 `adminId` 由 client body 提供（`route.ts:8-13,43`），破壞稽核歸屬可信度。修：改由 server 端 session 推導。
- **SEC-019**：HSTS 缺 `preload`（`next.config.ts:45`）。若要進 preload list 需補此 directive。
- **SEC-020**：`@google/generative-ai` 為未使用的 production 依賴（聊天已全用 `groq-sdk`）。修：確認後 `npm uninstall`。
- **SEC-021**：訂單編號用 `Date.now()`（多個 checkout 入口）；`orders`/`point_transactions` 等基底表的 UNIQUE/CHECK 約束不在版控，無法靜態確認唯一性與金額約束。
- **SEC-026**：`POST /api/reviews` 無限流（有 unique constraint 緩解）。
- **SEC-027**：`points-export` CSV 未防 `=+-@` 開頭的公式注入（`route.ts:29-30`）；欄位來源受控，風險低。

---

## 5. 正面確認（做得好的地方，修其他項時別破壞）

- **金流核心紮實**：Stripe（`stripe.webhooks.constructEvent` ＋ raw body）、PayPal（官方 verify-webhook-signature API）、ECPay（重算 CheckMacValue）三家 webhook **皆正確驗簽**，且**皆用條件式 UPDATE 防重放**（付款狀態轉移有冪等保護）。PayPal 另有專屬 race condition 單元測試。
- **金額不信前端**：一般結帳流程的最終金額由**伺服器端依 DB 商品價格重算**，非採用前端傳入值。
- **後台 session 設計正確**：token 為 `randomBytes(32)` 隨機值、存 DB、可撤銷、7 天過期（`src/lib/admin-token.ts`）；已修掉舊的「HMAC(密碼)」漏洞。密碼比對用 `timingSafeEqual` ＋ DB 持久化限流。
- **無 SQL 注入**：9 個 SQL 檔均參數化，唯一 `EXECUTE` 為安全的 trigger 語法；PostgREST filter 未發現由用戶輸入拼接者。
- **無 committed 密鑰**：掃描 `sk_live`/`whsec_`/PEM/JWT 等 pattern 皆零命中，僅 `.env.example`（全空值）進版控。
- **無可利用的開放重導**：`auth/callback` 的 `next` 參數驗證＋origin 拼接設計正確。
- **上傳驗證良好**：唯一上傳端點（後台產品圖）有 MIME＋副檔名＋大小驗證，且 admin-only。
- **安全 header 到位**：`poweredByHeader:false`、HSTS、`X-Frame-Options: DENY`、`nosniff`、`Referrer-Policy`、`Permissions-Policy`、nonce-based CSP（`next.config.ts` ＋ `src/proxy.ts`）。
- **聊天端點防護**：`GROQ_API_KEY` server-only；限流以 Supabase RPC 持久化實際生效（每 IP 10/分 ＋ 全站每日 `CHAT_DAILY_LIMIT`）。
- **應用層無 IDOR**：抽查訂單/預約/點數/評價/候補端點皆有正確 `user_id` 歸屬檢查（惟此保護依賴底層表有 RLS，見 SEC-002）。

---

## 6. 需站方自行確認（唯讀無法驗證的項目）

以下項目決定數個高風險發現的實際可利用性，但只能在後台看到，請在 staging 或 Dashboard 確認（**勿在 production 動手實測**）：

1. **Supabase 各敏感表的實際 `anon`/`authenticated` grants**——決定 SEC-002／SEC-005／SEC-007 的可利用性。（Dashboard → Authentication → Policies，以及各表的 RLS 開關與紅色警告。）
2. **`admin_settings`、`orders`、`point_transactions`、`coupons`、`products` 的 RLS 與 UNIQUE/CHECK 約束**——基底 schema 不在版控（SEC-010／SEC-021）。
3. **Vercel 各環境（Production／Preview）是否確實設定** `CRON_SECRET`／`REVALIDATE_SECRET`／`SANITY_WEBHOOK_SECRET`／`ADMIN_PASSWORD`——SEC-008 的前提。
4. **`decrement_stock`／`increment_stock` RPC** 是否建於 Dashboard 未進版控，其庫存扣減是否原子——影響超賣風險（本次未能靜態稽核）。

---

## 7. 附錄：方法論與殘餘不確定性

- **工具**：人工讀碼、`git grep`/`rg`、`npm audit`、Next.js 官方安全公告與文件查證。
- **殘餘不確定性**：SEC-002/005/007 的可利用性建立在「Supabase 表無 RLS ⇒ anon 可存取」的常見預設假設上，未連線確認；SEC-006 的 race 為程式邏輯推理（未動態觸發，符合唯讀原則）；`otplib` 預設 TOTP window 未檢視 node_modules 原始碼（不影響 SEC-001 結論——無限流才是主因）。
- **嚴重度方法**：綜合可利用性、影響面（尤其 PII 與金流）、與其他弱點的組合效應。凡條件性可利用者（SEC-002/010）已標明條件與需確認事項，未誇大亦未淡化。

---
*本報告為白箱靜態審查，不取代 staging 環境的動態滲透測試。修復請依配套的改善計畫文件分階段執行，高風險區（金流/庫存/auth/RLS/cron）改動後務必 `npm run test` 並依 `.claude/playbooks/judgment.md` 高風險驗收。*
