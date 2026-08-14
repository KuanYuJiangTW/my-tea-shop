-- ─────────────────────────────────────────────────────────────────────────
-- 建立第一個品飲組（tasks 2.5）
--
-- ⚠️ 先跑 `supabase/add_product_bundles.sql`，再跑這支。
--
-- 內容：阿里山高山烏龍／蜜香紅茶／阿里山金萱 各 75g × 1
-- 定價：650（三包單買合計 700，折 50）
--
-- 紅烏龍與四季春的 `stock_75g` 目前是 0（業主 2026-08-13 說明為暫時缺貨），
-- 本版不納入。補貨後若要出四款版，另建一個 bundle，不要改這一個——
-- 舊訂單的成分快照雖然存在訂單裡，但改動上架中的組合會讓前台與客服對不上。
--
-- `is_active` 刻意留 false：前台程式碼上線、內容確認過之後，再手動打開。
-- ─────────────────────────────────────────────────────────────────────────

insert into public.product_bundles (slug, name, name_en, description, description_en, price, is_active)
values (
  'tasting-set',
  '品飲組',
  'Tasting Set',
  '三款阿里山高山茶各 75g，附手提袋。第一次買茶的人從這裡開始——一次認識烏龍的蘭花香、蜜香紅茶的蜜甜、金萱的奶香。',
  'Three Alishan high-mountain teas, 75g each, with a carry bag. The place to start if this is your first time: the orchid note of our oolong, the honey sweetness of the black tea, and the milky aroma of Jin Xuan.',
  650,
  false
)
on conflict (slug) do nothing;

-- 成分：用 name 反查 product_id，避免把 id 寫死
insert into public.product_bundle_items (bundle_id, product_id, spec, quantity)
select b.id, p.id, '75g', 1
from public.product_bundles b
cross join public.products p
where b.slug = 'tasting-set'
  and p.name in ('阿里山高山烏龍茶', '蜜香紅茶', '阿里山金萱茶')
on conflict (bundle_id, product_id, spec) do nothing;

-- ── 驗證 ─────────────────────────────────────────────────────────────────
--   -- 應該是 3 列，spec 皆為 75g：
--   select b.name, b.price, b.is_active, p.name as 成分, bi.spec, bi.quantity
--   from product_bundles b
--   join product_bundle_items bi on bi.bundle_id = b.id
--   join products p on p.id = bi.product_id
--   where b.slug = 'tasting-set';
--
--   -- 可售量應為 min(50, 53, 48) = 48：
--   select min(p.stock_75g) as 可售量
--   from product_bundles b
--   join product_bundle_items bi on bi.bundle_id = b.id
--   join products p on p.id = bi.product_id
--   where b.slug = 'tasting-set';
