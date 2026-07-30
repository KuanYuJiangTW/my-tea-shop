-- ─────────────────────────────────────────────────────────────────────────────
-- RLS 稽核腳本（唯讀）
--
-- 用途：確認線上資料庫的 Row Level Security 實際狀態。這件事無法從程式碼確認，
--       只能在 Supabase Dashboard → SQL Editor 執行。
--
-- 安全性：全部是 SELECT，不會修改任何資料或設定。可安全地在 production 執行。
--
-- 背景：2026-06-25 稽核發現 orders 表被多建了 3 條 {public} 寫入政策，允許已登入
--       者用 anon key 直接把 payment_status 改成 'paid'（＝免費取貨）。當日已修，
--       但這是資料庫端狀態，每次稽核都要重新確認。
-- ─────────────────────────────────────────────────────────────────────────────


-- ① orders 的政策清單 ── 最高優先
--
-- 期待結果：只有 SELECT 政策，且 qual 限制為 auth.uid() = user_id。
-- 🚨 危險訊號：出現 cmd 為 INSERT / UPDATE / DELETE / ALL 且 roles 含
--    {public} 或 {authenticated} 的政策 → 立刻 drop。
select
  policyname,
  cmd,
  roles,
  qual        as using_條件,
  with_check  as with_check_條件
from pg_policies
where schemaname = 'public' and tablename = 'orders'
order by cmd, policyname;


-- ② 全部資料表的 RLS 開關狀態
--
-- 期待結果：rls_已啟用 全部為 true。
-- 🚨 危險訊號：任何含個資或金流的表為 false（orders、order_items、profiles、
--    experience_bookings、booking_participants、point_transactions、coupons…）
select
  c.relname                as 資料表,
  c.relrowsecurity         as rls_已啟用,
  c.relforcerowsecurity    as rls_強制套用,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as 政策數
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
order by c.relrowsecurity asc, c.relname;   -- 未開 RLS 的排最前面


-- ③ 全庫的公開寫入政策總覽
--
-- 期待結果：0 筆，或每一筆你都能說出它為什麼必須存在。
-- 🚨 危險訊號：金流／點數／訂單相關的表出現在這裡。
select
  tablename   as 資料表,
  policyname  as 政策名稱,
  cmd         as 操作,
  roles,
  with_check  as with_check_條件
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (roles::text like '%public%' or roles::text like '%anon%')
order by tablename, cmd;


-- ④ 限流 RPC 的執行權限（對應資安報告 L-6）
--
-- 期待結果：check_rate_limit / bump_rate_limit 不應授權給 anon 或 public。
-- 目前是靠 RLS 擋 anon 寫入，較脆弱；理想是明確只授權 service_role。
select
  p.proname                                   as 函式,
  pg_get_userbyid(p.proowner)                 as 擁有者,
  p.prosecdef                                 as security_definer,
  coalesce(array_to_string(p.proacl, E'\n'), '（預設：PUBLIC 可執行）') as 執行權限
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('check_rate_limit', 'bump_rate_limit', 'validate_admin_session',
                    'increment_stock', 'decrement_stock')
order by p.proname;


-- ⑤ 存有敏感 PII 的表，其政策是否夠嚴（對應資安報告 L-3）
--
-- booking_participants 存身分證字號、生日、緊急聯絡人。
-- 期待結果：只有「本人可讀自己的」政策，無任何公開讀取。
select
  tablename  as 資料表,
  policyname as 政策名稱,
  cmd        as 操作,
  roles,
  qual       as using_條件
from pg_policies
where schemaname = 'public'
  and tablename in ('booking_participants', 'profiles', 'experience_bookings')
order by tablename, cmd;
