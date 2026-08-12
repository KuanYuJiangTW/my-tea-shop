-- ─────────────────────────────────────────────────────────────────────────
-- orders.is_test 自動標記：業主自己下的單一律視為測試單
--
-- 為什麼要 trigger 而不是改程式：`add_orders_is_test.sql` 的回填是一次性的
-- UPDATE，欄位預設又是 false，所以**下一筆測試單就會混進真實數字裡**。
-- 建單有四條路徑（/api/orders、/api/ecpay/checkout、/api/stripe/checkout、
-- /api/paypal/create-order），在四個地方各加一次判斷，遲早會漏掉一條；
-- 放在資料庫則是一個進入點，而且不需要改任何程式碼。
--
-- ⚠️ 這裡把 email 寫死了，不夠優雅但這是「不會忘記」的代價。
--    **業主換 email 就要回來改這個函式**（同時記得回填舊資料）。
--
-- 例外處理：如果業主用自己的 email 下了一筆**真單**（例如買來送人，想算進
-- 營收），trigger 一樣會標成測試。要救回來就在事後單獨改那一筆：
--    update orders set is_test = false where id = '<order_id>';
--    （Postgres 的 trigger 分不出「明確傳 false」與「吃預設 false」，
--      所以只能事後改，沒辦法在 insert 當下豁免）
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.mark_owner_orders_as_test()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if lower(coalesce(new.customer_email, '')) = 'qdbzdt2846@gmail.com' then
    new.is_test := true;
  end if;
  return new;
end;
$$;

-- before insert：要在寫入前改掉 NEW，用 after 就來不及了。
-- 只掛 insert 不掛 update——事後手動改 is_test 的那條路要留著（見上面的例外處理）。
drop trigger if exists trg_orders_mark_test on public.orders;
create trigger trg_orders_mark_test
  before insert on public.orders
  for each row
  execute function public.mark_owner_orders_as_test();

-- 驗證用（下一筆自己的測試單建立後跑，應該直接是 true）：
--   select id, customer_email, is_test, created_at
--   from orders order by created_at desc limit 3;
--
-- 確認 trigger 掛上了：
--   select tgname, tgenabled from pg_trigger
--   where tgrelid = 'public.orders'::regclass and not tgisinternal;
