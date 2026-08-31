-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-08-31 平行稽核留下的待線上查證項（⚠️ 全部唯讀，不改任何東西）
--
-- 背景：當天用三個平行 subagent 做了 RLS／文案／i18n 稽核。RLS 那份的結論是
-- **repo 稽核先天看不到真相**——`orders`／`products`／`profiles` 從未進版控，
-- 2026-07-28 的權限修補也是直接在 Dashboard 做的、沒進 git。
-- 依 JUDG-9「線上與歷史的狀態，只有那個系統本身能回答」，以下問題只能線上查。
--
-- 怎麼跑：開一個新的 Claude session（`.mcp.json` 已含唯讀的 supabase MCP，
-- 新 session 才載得到它的工具），把每段貼給它跑，或直接在 Supabase SQL Editor 執行。
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Q1（高）候補計數函式的執行權限有沒有被收回 ────────────────────────────
--
-- 為什麼問：sql/add_reviews_waitlist.sql（2026-04-08）建立這兩個函式時是
-- SECURITY DEFINER 且沒有 REVOKE。2026-07-28 的 rpc-grants-remediation.sql
-- 只收了 decrement_stock／increment_stock／check_rate_limit／bump_rate_limit
-- 四個，這兩個不在名單內。PostgreSQL 建立函式預設把 EXECUTE 給 PUBLIC，
-- 所以除非當時順手在 Dashboard 收過，anon key（會打包進瀏覽器）就能呼叫它們
-- 竄改候補人數。
--
-- 期待結果：目前權限只剩 postgres 與 service_role；
--          若看到 anon= / authenticated= 或開頭為 "=" 的 PUBLIC 項 → 有洞，
--          照 rpc-grants-remediation.sql 的 STEP 2a 收掉。
select
  p.oid::regprocedure                as 簽章,
  p.prosecdef                        as security_definer,
  array_to_string(p.proacl, ' | ')   as 目前權限
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('increment_waitlist_count', 'decrement_waitlist_count')
order by p.proname;


-- ── Q1b 順便掃全部：還有哪些函式是 anon 可執行的 ──────────────────────────
--
-- 上面那條是「已知的漏網」。這條是「還有沒有第三隻」。
-- ⚠️ validate_admin_session 出現在結果裡是**正常的**——src/proxy.ts 的 Edge
--    middleware 刻意用 anon key 呼叫它（避免把 service_role 帶進 Edge Runtime）。
--    收掉它會導致後台完全無法登入。
select
  p.oid::regprocedure                as 簽章,
  p.prosecdef                        as security_definer,
  array_to_string(p.proacl, ' | ')   as 目前權限
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and (p.proacl is null                                   -- null = 沿用預設，PUBLIC 可執行
       or array_to_string(p.proacl, ' ') like '%anon=%'
       or array_to_string(p.proacl, ' ') like '%authenticated=%')
order by p.prosecdef desc, p.proname;                     -- SECURITY DEFINER 的排前面


-- ── Q2（高）orders 那「3 條危險寫入政策」還在不在 ─────────────────────────
--
-- 為什麼問：auto-memory 的 project_security_audit 記著「RLS 全開但 orders 有
-- 3 條危險寫入政策待刪」（2026-07 寫下）。repo 裡找不到對應——orders 這張表
-- 從未在任何 tracked SQL 建立過。所以「是哪三條、修掉了沒」只有線上知道。
--
-- 危險的形狀：FOR INSERT/UPDATE/DELETE 且 qual/with_check 是 true 或 null，
-- 且 roles 含 anon 或 public。
select
  tablename                          as 資料表,
  policyname                         as 政策名,
  cmd                                as 操作,
  roles                              as 適用角色,
  qual                               as using條件,
  with_check                         as withcheck條件
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (qual is null or qual = 'true' or with_check is null or with_check = 'true')
order by
  (roles::text like '%anon%') desc,   -- anon 可寫的排最前面
  tablename, policyname;


-- ── Q3（高）存個資的表有沒有 RLS ──────────────────────────────────────────
--
-- 為什麼問：booking_participants 存**身分證字號**，repo 的 booking_schema.sql
-- 裡完全沒有 RLS 設定。points_system.sql 建立的 user_membership／coupon_templates
-- （決定折扣）同樣沒有。這些可能線上有、只是沒進 git——但也可能真的沒開。
--
-- 期待結果：rls_enabled 全部為 true，且 政策數 > 0。
--   rls_enabled = false            → 該表對 anon 完全開放，最嚴重
--   rls_enabled = true 且 政策數 = 0 → 業主自己也動不了那張表
--                                     （lessons.md 2026-08-15 踩過這個）
select
  c.relname                                        as 資料表,
  c.relrowsecurity                                 as rls_enabled,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as 政策數
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by
  c.relrowsecurity asc,                            -- 沒開 RLS 的排最前面
  政策數 asc,
  c.relname;


-- ── Q4（中）確認 repo 看不到的三張表確實存在且結構符合預期 ────────────────
--
-- 為什麼問：orders／products／profiles 的建表 SQL 從未進版控。這條不是找洞，
-- 是把「真實 schema」撈出來，之後好補一份 baseline migration 進 repo，
-- 讓未來的 repo 稽核不再先天失明。
select
  table_name                         as 資料表,
  column_name                        as 欄位,
  data_type                          as 型別,
  is_nullable                        as 可空
from information_schema.columns
where table_schema = 'public'
  and table_name in ('orders', 'products', 'profiles', 'booking_participants')
order by table_name, ordinal_position;
