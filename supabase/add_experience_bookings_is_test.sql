-- ─────────────────────────────────────────────────────────────────────────
-- experience_bookings.is_test：把測試預約與真實預約分開
--
-- 為什麼需要：綠界的測試模式（ECPAY_MODE=stage，見 src/lib/ecpay-env.ts）
-- 只能在 Vercel Preview 跑，而 Preview 連的是**同一個正式資料庫**（沒有
-- staging DB）。所以每跑一次金流測試，正式資料裡就多一筆「看起來已付款、
-- 實際沒收到錢」的預約，混進本月體驗收款與六個月營收圖表。
--
-- 靠「測完記得刪」是不行的——那件事只要忘記一次，數字就永遠對不回來，
-- 而且你不會知道它錯了。`orders.is_test` 當初就是為了同一個問題而加的
-- （2026-08-12 盤點時 122 筆訂單有 94 筆是測試單），這裡沿用同一套做法。
--
-- 這支 SQL 是**加欄位（additive）**：既有寫入路徑不指定 is_test 就吃
-- default false，不需要改任何建單程式碼。
--
-- ## 執行順序不重要
--
-- 程式端刻意設計成「**只有測試模式才送 is_test 欄位**」——正式站永遠不會
-- 提到這個欄位，所以這支 SQL 還沒跑也不會影響真實結帳。讀取端（儀表板）
-- 則有 42703 兩段式 fallback：查不到欄位就退回不過濾並印警告，不會讓
-- 儀表板整塊消失。
-- ─────────────────────────────────────────────────────────────────────────

alter table public.experience_bookings
  add column if not exists is_test boolean not null default false;

comment on column public.experience_bookings.is_test is
  '綠界測試模式（Preview 部署）產生的預約。營收統計一律排除；正式站永遠寫入 false';

-- 部分索引：報表只查「非測試」的預約，測試單不進索引。
-- 用 where is_test = false 而不是全欄索引，因為真實預約才是被反覆查的那一群。
create index if not exists idx_experience_bookings_real
  on public.experience_bookings (created_at desc)
  where is_test = false;

-- ── 回填：把已知的測試預約標起來 ────────────────────────────────────────
-- 目前只有一筆：2026-08-23 驗證開課請求流程時建立的（R2608-E59D 那場，
-- 停在 pending_payment 沒有真的付款）。用 session 反查，不用寫死 id。
update public.experience_bookings b
set is_test = true
from public.experience_sessions s
where b.session_id = s.id
  and s.created_from_request_id is not null
  and b.status = 'pending_payment';

-- ── 驗證：跑完應該看到測試筆數與真實筆數分開 ────────────────────────────
select is_test, count(*) as 筆數, coalesce(sum(total_price), 0) as 金額
from public.experience_bookings
group by is_test
order by is_test;
