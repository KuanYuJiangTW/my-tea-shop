-- ─────────────────────────────────────────────────────────────────────────
-- orders.is_test：把自己測試的訂單與真實訂單分開
--
-- 為什麼需要：2026-08-12 盤點時，122 筆訂單裡有 94 筆來自業主自己的 email
-- （＝ ADMIN_EMAIL）。也就是說「平均客單價、轉換率、免運達成率」這些數字
-- 全部被測試單汙染——排除後真實已付款訂單只有 6 筆，來自 3 個客人。
--
-- 現在唯一的辨識方式是「email 等於某個值」，很脆弱：換一個 email 測就破功，
-- 而且查詢端每個地方都要記得排除。改成資料庫欄位，判斷只做一次。
--
-- 這支 SQL 是**加欄位（additive）**：既有寫入路徑不指定 is_test 就吃 default false，
-- 不需要改任何建單程式碼。欄位在被查詢端引用之前是惰性的。
-- ─────────────────────────────────────────────────────────────────────────

alter table public.orders
  add column if not exists is_test boolean not null default false;

-- 部分索引：報表只會查「非測試」的訂單，測試單不進索引。
-- 用 where is_test = false 而不是全欄索引，因為真實單才是被反覆查的那一群。
create index if not exists idx_orders_real
  on public.orders (created_at desc)
  where is_test = false;

-- ── 回填 ────────────────────────────────────────────────────────────────
-- 把業主自己 email 的歷史訂單標成測試單。
-- ⚠️ 執行前請確認這個 email 底下**沒有你真正想留在報表裡的訂單**
--    （例如自己買來送人的真單）。要反悔就是把 true 改回 false 再跑一次。
-- 預期影響列數：94（2026-08-12 的盤點結果）
update public.orders
   set is_test = true
 where lower(customer_email) = 'qdbzdt2846@gmail.com';

-- 驗證用：
--   select is_test, count(*), count(distinct customer_email) as 客戶數
--   from orders group by is_test;
--   -- 預期：is_test=true 94 筆 / is_test=false 28 筆
--
-- 之後算 AOV 就固定加上 is_test = false：
--   select count(*) as 訂單數, round(avg(subtotal)) as 平均小計,
--          percentile_cont(0.5) within group (order by subtotal) as 中位小計
--   from orders
--   where payment_status = 'paid' and order_status <> 'cancelled' and is_test = false;
