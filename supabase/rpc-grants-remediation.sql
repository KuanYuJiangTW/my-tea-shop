-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 執行權限修補（⚠️ 本檔會「修改」資料庫權限，不是唯讀）
--
-- 起因：2026-07-28 的 RLS 稽核（supabase/rls-audit.sql 第 ④ 段）發現
--       decrement_stock 有兩個同名多載，其中一個是 SECURITY DEFINER，
--       且 EXECUTE 權限開放給 PUBLIC / anon。
--
--       SECURITY DEFINER = 以函式擁有者（postgres）身分執行 = 完全繞過 RLS。
--       anon key 會打包進瀏覽器、Supabase 把 RPC 開在 /rest/v1/rpc/<name>、
--       參數名寫在公開 repo 裡 → 任何人免登入即可扣光庫存。
--
--       這不是誰改壞的：PostgreSQL 建立函式時，預設就把 EXECUTE 給 PUBLIC。
--
-- 前提：本專案所有 RPC 呼叫都在伺服器端（API routes / lib / cron），使用
--       service_role。已逐一確認無任何前端元件用 anon key 直接呼叫。
--
-- ⚠️⚠️ validate_admin_session 不在修補範圍內 ⚠️⚠️
--       src/proxy.ts 的 Edge middleware 是「刻意」用 anon key 呼叫它的
--       （避免把 service_role key 帶進 Edge Runtime），它做成 SECURITY
--       DEFINER + 開放 anon 正是為此。收掉會導致整個後台無法登入。
--       其防護來自 256-bit 隨機 token，暴力破解不可行。
-- ─────────────────────────────────────────────────────────────────────────────


-- ── STEP 1：先看清楚要動的東西（唯讀，請先跑這段並確認輸出）────────────────
--
-- 重點確認：decrement_stock 的兩個多載，參數各是什麼？哪一個是 SECURITY
-- DEFINER？應用程式呼叫的是 (p_id, qty, spec)。若發現有用不到的舊多載，
-- 它可能是歷史遺留，應另外評估是否 DROP（本檔不代為刪除）。
select
  p.oid::regprocedure                          as 完整簽章,
  p.prosecdef                                  as security_definer,
  pg_get_userbyid(p.proowner)                  as 擁有者,
  coalesce(array_to_string(p.proacl, ' | '), '（預設：PUBLIC 可執行）') as 目前權限
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('decrement_stock', 'increment_stock',
                    'check_rate_limit', 'bump_rate_limit')
order by p.proname, 完整簽章;

-- 想看函式內容再跑這段（確認 decrement_stock 到底做了什麼）：
-- select p.oid::regprocedure, pg_get_functiondef(p.oid)
-- from pg_proc p
-- where p.pronamespace = 'public'::regnamespace and p.proname = 'decrement_stock';


-- ── STEP 2：收回權限（⚠️ 這段會實際修改權限）──────────────────────────────
--
-- 用 DO block 逐一處理，因為 decrement_stock 有多個多載，
-- 單寫 revoke ... on function decrement_stock 會因簽章不明確而失敗。
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('decrement_stock', 'increment_stock',
                        'check_rate_limit', 'bump_rate_limit')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant  execute on function %s to service_role', r.sig);
    raise notice '已收回並改授 service_role：%', r.sig;
  end loop;
end $$;


-- ── STEP 3：驗收（唯讀）────────────────────────────────────────────────────
--
-- 期待結果：目前權限欄位只剩 postgres 與 service_role，
--          不再出現 anon= 或 authenticated=，也不再有開頭為 "=" 的 PUBLIC 項。
select
  p.oid::regprocedure                          as 完整簽章,
  p.prosecdef                                  as security_definer,
  array_to_string(p.proacl, ' | ')             as 目前權限
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('decrement_stock', 'increment_stock',
                    'check_rate_limit', 'bump_rate_limit')
order by p.proname, 完整簽章;


-- ── STEP 4：跑完後請在網站上實測 ───────────────────────────────────────────
--
-- 這些函式是結帳與限流的核心路徑，權限改動後務必實跑一次：
--   1. 下一筆測試訂單走完付款 → 確認庫存有正確扣減（decrement_stock）
--   2. 後台取消該訂單          → 確認庫存有還原（increment_stock）
--   3. 後台登入一次            → 確認 2FA 與限流正常（check/bump_rate_limit）
--   4. 後台頁面能正常瀏覽      → 確認 validate_admin_session 未受影響
--
-- 若第 4 項失敗，代表誤收了 validate_admin_session，執行以下復原：
--   grant execute on function validate_admin_session(text) to anon, authenticated;
