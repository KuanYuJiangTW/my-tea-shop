-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 執行權限修補（⚠️ 本檔會「修改」資料庫，不是唯讀）
--
-- 2026-07-28 稽核 STEP 1 的實際輸出：
--
--   decrement_stock(integer, integer)        security_definer = TRUE   ← 問題
--   decrement_stock(integer, integer, text)  security_definer = false  ← 應用程式用這個
--   increment_stock(integer, integer, text)  security_definer = false
--   check_rate_limit(text, integer, bigint)  security_definer = false
--   bump_rate_limit(text, bigint)            security_definer = false
--
-- 全部的 EXECUTE 都開放給 PUBLIC / anon（PostgreSQL 建立函式時的預設行為，
-- 不是誰改壞的）。
--
-- 核心發現：兩參數版的 decrement_stock 是「規格（spec）」功能出現之前的
-- 舊版本，程式碼裡已無任何呼叫點（4 處呼叫全部傳 3 個參數，且 spec 在
-- src/app/api/orders/route.ts:87 一定會被填上預設值並通過白名單驗證）。
-- 偏偏這個沒清掉的孤兒是 SECURITY DEFINER —— 以 postgres 身分執行、
-- 完全繞過 RLS，而且 anon 可以呼叫。
--
-- 攻擊方式：POST /rest/v1/rpc/decrement_stock 帶 {"p_id":1,"qty":9999}
-- （不帶 spec），PostgREST 依參數名解析到兩參數版本 → 免登入扣光庫存。
-- anon key 本來就會打包進瀏覽器，因此無需任何憑證。
--
-- 對照：三參數版不是 SECURITY DEFINER，以 anon 身分執行會被 products 的
-- RLS 擋下（該表 RLS 已啟用且無政策）。應用程式能正常運作是因為伺服器端
-- 用 service_role，本身即繞過 RLS。
--
-- ⚠️⚠️ validate_admin_session 不在本檔範圍 ⚠️⚠️
--       src/proxy.ts 的 Edge middleware 是「刻意」用 anon key 呼叫它的
--       （避免把 service_role key 帶進 Edge Runtime），它做成 SECURITY
--       DEFINER + 開放 anon 正是為此。收掉會導致後台完全無法登入。
-- ─────────────────────────────────────────────────────────────────────────────


-- ── STEP 2a：立即止血 — 收回執行權限（低風險，可先單獨執行）────────────────
--
-- 用 DO block 是因為 decrement_stock 有多載，單寫函式名會因簽章不明確而報錯。
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


-- ── STEP 2b：確認孤兒函式真的沒人用，再刪 ─────────────────────────────────
--
-- 先跑這段唯讀查詢，看兩參數版的參數名與內容，確認它就是 spec 之前的舊版：
select
  p.oid::regprocedure                as 簽章,
  pg_get_function_arguments(p.oid)   as 參數,
  p.prosecdef                        as security_definer,
  pg_get_functiondef(p.oid)          as 定義
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname = 'decrement_stock'
order by 簽章;

-- ⚠️ 刪之前務必先跑這兩個檢查 ⚠️
--
-- (1) 把上面查詢輸出的「定義」欄位複製存檔。DROP 之後要復原就只能靠它。
--
-- (2) 資料庫內部是否還有人在呼叫它？程式碼裡沒有呼叫點，不代表 DB 裡沒有——
--     其他 function 的內文、trigger 都可能呼叫。期待結果：0 筆。
select
  p.oid::regprocedure as 呼叫者,
  p.prosrc            as 內文片段
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.prosrc ilike '%decrement_stock%'
  and p.proname <> 'decrement_stock';        -- 排除它自己

select
  c.relname   as 資料表,
  t.tgname    as trigger名稱,
  p.proname   as 觸發函式
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc  p on p.oid = t.tgfoid
where not t.tgisinternal
  and p.prosrc ilike '%decrement_stock%';


-- 兩個檢查都是 0 筆才執行刪除（STEP 2a 已止血，這步不急，可隔幾天再做）。
-- 刪掉比只收權限更徹底：日後誰不小心重新 grant，洞也不會回來。
--
--   drop function if exists public.decrement_stock(integer, integer);
--
-- ⚠️ 只刪兩參數版。三參數版 (integer, integer, text) 是應用程式在用的，刪了結帳會壞。
-- 註：`drop function` 不加 cascade；若有物件相依於它，PostgreSQL 會直接報錯
--     並列出相依者——那就是第三道保險，報錯代表不能刪，別加 cascade 硬刪。


-- ── STEP 3：驗收（唯讀）────────────────────────────────────────────────────
--
-- 期待結果：目前權限只剩 postgres 與 service_role；
--          不再出現 anon= / authenticated=，也不再有開頭為 "=" 的 PUBLIC 項。
select
  p.oid::regprocedure                      as 簽章,
  p.prosecdef                              as security_definer,
  array_to_string(p.proacl, ' | ')         as 目前權限
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('decrement_stock', 'increment_stock',
                    'check_rate_limit', 'bump_rate_limit')
order by p.proname, 簽章;


-- ── STEP 4：跑完後在網站上實測 ─────────────────────────────────────────────
--
-- 這些是結帳與限流的核心路徑，權限改動後務必實跑：
--   1. 下一筆測試訂單走完付款 → 庫存正確扣減（decrement_stock 三參數版）
--   2. 後台取消該訂單          → 庫存正確還原（increment_stock）
--   3. 後台登入一次            → 2FA 與限流正常（check/bump_rate_limit）
--   4. 後台頁面正常瀏覽        → validate_admin_session 未受影響
--
-- 若第 4 項失敗，代表誤收了 validate_admin_session，復原：
--   grant execute on function validate_admin_session(text) to anon, authenticated;
