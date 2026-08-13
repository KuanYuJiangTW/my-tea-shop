# Design: 風土數位報價頁

## Context

taiwantea.store 是正式營運中的電商（Next 16 App Router、扁平路由無 `[locale]`、next-intl 由 `src/proxy.ts` 依 `/en` 路徑前綴注入 locale header）。要新增的報價頁是純行銷頁＋匿名訪客諮詢表單，不碰金流、庫存、auth 核心。

偵察確認的現有慣例（實作必須貼齊，不自創）：

- **頁面模式**（`src/app/contact/`）：server page 負責 `metadata`（`langAlternates()` 組 hreflang，見 `src/lib/seo.ts`）與靜態區塊（`await getTranslations()`）；互動表單拆同目錄 `XxxClient.tsx`（`"use client"`、受控 `useState`、原生 HTML 元素手寫 Tailwind、`fetch` POST 到自家 API route）。**不用** server action、react-hook-form、shadcn ui 元件（已裝但全站未用）。
- **寫入模式**（`src/app/api/waitlist/route.ts`）：API route 內用 `src/lib/supabase.ts` 的 service_role client `.insert()`，並套 `@/lib/rate-limit`。
- **寄信**（`src/lib/email.ts`）：Resend；`sendContactEmail()`（`email.ts:124-184`）就是「組 HTML → 寄到 ADMIN」的現成結構，照抄改欄位即可。
- **SQL 檔**：平鋪目錄 `supabase/add_<feature>.sql`，描述性命名無時間戳；RLS 寫法範例見 `sql/add_reviews_waitlist.sql:19-30`。
- **i18n**：`messages/zh.json`＋`messages/en.json`，頂層 camelCase namespace（本功能用 `webDesign`）；站內連結用 `lp(path)`（`locale === "en" ? "/en"+path : path`）。
- **測試**：Vitest，`src/__tests__/<domain>/<feature>.test.ts`，可複用 `src/__tests__/points/helpers/supabase-mock.ts` 的 `createChainMock`/`createTableRouter`。

## Goals / Non-Goals

**Goals:**

- `/web-design` 報價頁：品牌敘事、三階報價卡、加購與維護方案、FAQ、商業條款，雙語＋SEO metadata
- 六題諮詢表單：驗證 → 落庫 `web_inquiries` → admin email 通知 → 成功後 LINE 導流
- Footer 徽章入口（雙語）
- 防濫用：rate-limit＋honeypot 欄位

**Non-Goals:**

- admin panel 的諮詢列表 UI（初期用 email 通知＋直接查 DB 即可）
- 獨立網域／子網域（未來案源穩定再搬）
- 線上簽約、金流、自動報價計算
- 課程與 SaaS 內容（頁尾一行「籌備中」文案而已）

## Decisions

1. **表單提交走 API route `POST /api/web-inquiry`，不開匿名 RLS insert policy。**
   `web_inquiries` 啟用 RLS 但不建任何 anon/authenticated policy（deny by default），寫入一律經 API route 的 service_role client。理由：全站查無匿名 insert policy 先例（現有 insert policy 都綁 `auth.uid()`）；經 API route 才能套 rate-limit、欄位驗證與 honeypot，開匿名 policy 等於讓 spam 直寫 DB。替代方案「anon insert policy」被否決。
2. **寄信 best-effort，不影響落庫結果。**
   insert 成功後才寄 admin 通知；寄信失敗只 `console.error`，API 仍回成功——諮詢資料已在 DB，通知遺失可接受，反之（信寄了資料丟了）不可接受。新函式 `sendWebInquiryEmail()` 照 `sendContactEmail()` 結構寫在 `src/lib/email.ts`。
3. **LINE 連結用 `NEXT_PUBLIC_LINE_ADD_URL` 環境變數，未設定就隱藏按鈕。**
   業主的 LINE 帳號還沒提供；缺省時成功畫面只顯示「已收到，我們會在一個工作天內回覆」，不出現壞連結。之後補環境變數即生效，不用改碼。
4. **報價內容（三階、加購、FAQ）放 `messages/` 當靜態文案，不落 DB／Sanity。**
   報價是行銷內容且需雙語，改動頻率低；進 CMS 是過度設計。改價格＝改 messages＋redeploy。
5. **頁面拆分照 contact 慣例**：`src/app/web-design/page.tsx`（server：metadata＋Hero＋報價卡＋FAQ 等靜態區塊）＋`InquiryFormClient.tsx`（client：六題表單）。
6. **痛點題（複選）在 DB 存 `text[]`；預算與時程存 enum 字串。**驗證在 API route 做白名單檢查，防任意字串灌入。

## Risks / Trade-offs

- [表單 spam] → rate-limit（沿用 `@/lib/rate-limit`）＋honeypot 隱藏欄位（填了即靜默丟棄）＋欄位白名單驗證
- [寄信失敗漏接商機] → 資料必在 DB；`ADMIN_EMAIL` 已有 fallback 硬編碼；未來可加 admin panel 列表（non-goal）
- [茶品牌與接案品牌混淆] → 入口只放 Footer 徽章（低調）；報價頁自成一格但沿用站內 Header/Footer——`SiteChrome` 對非 `/admin` 路徑自動掛載，不需改動
- [新表 RLS 設錯] → deny-by-default 是最保守設定；測試涵蓋「API 成功寫入」與「驗證拒絕」路徑；照 CLAUDE.md 鐵律 4 實作後跑全套測試

## Migration Plan

1. `supabase/add_web_inquiries.sql` 由業主在 Supabase SQL editor 執行（本專案慣例，無 CLI migration 流程）
2. 程式碼部署 Vercel；`NEXT_PUBLIC_LINE_ADD_URL` 之後在 Vercel env 補上即可
3. 回滾：頁面下架＝revert commit；資料表保留不影響既有功能

## Open Questions

- 業主的 LINE 帳號連結（不阻塞實作，缺省即隱藏）
- 「風土數位」公司名／商標登記確認（不阻塞；頁面文案以品牌名呈現，不涉法律主體宣稱）
