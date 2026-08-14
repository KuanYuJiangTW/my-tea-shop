-- ─────────────────────────────────────────────────────────────────────────
-- 品飲組：組合商品的資料模型 ＋ 原子性扣減
--
-- 首版組合＝阿里山高山烏龍／蜜香紅茶／阿里山金萱 各 75g × 1，定價 650，附手提袋。
--
-- ⚠️ 這支 SQL 屬**高風險區（庫存扣減）**。執行前請先讀
--    `openspec/specs/product-ordering/` 與 `openspec/changes/tasting-set/design.md`。
--
-- 設計要點（完整理由見 design.md D1–D3）：
--   * 成分存在資料表，不寫死在程式碼——「哪些組合用到金萱 75g」要能用索引反查
--   * 組合**不預先打包**，所以沒有獨立庫存欄位；可售量由成分即時推導
--   * 扣減放在單一 plpgsql 函式內，靠 Postgres 的交易語意拿到「全成功或全不動」。
--     應用層迴圈做不到這件事——那正是 orders/route.ts 修正前的缺陷成因
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. 組合本身 ──────────────────────────────────────────────────────────
create table if not exists public.product_bundles (
  id          integer generated always as identity primary key,
  slug        text        not null unique,
  name        text        not null,
  name_en     text,
  description text,
  description_en text,
  price       integer     not null check (price > 0),
  is_active   boolean     not null default false,   -- 預設不上架，內容確認後才開
  created_at  timestamptz not null default now()
);

comment on column public.product_bundles.price is
  '組合定價，不由成分售價加總推導（design.md D6）。首版 650：差額 350 剛好等於一包金萱 150g，命中免運門檻';

-- ── 2. 組合成分 ──────────────────────────────────────────────────────────
create table if not exists public.product_bundle_items (
  id         integer generated always as identity primary key,
  bundle_id  integer not null references public.product_bundles(id) on delete cascade,
  product_id integer not null references public.products(id),
  spec       text    not null check (spec in ('150g', '75g', 'teabag')),
  quantity   integer not null default 1 check (quantity > 0),
  unique (bundle_id, product_id, spec)
);

-- 反查用：可售量計算與「這款茶缺貨會影響哪些組合」都走這個方向
create index if not exists idx_bundle_items_product
  on public.product_bundle_items (product_id, spec);

-- ── 3. RLS：公開只看得到上架中的組合 ─────────────────────────────────────
alter table public.product_bundles      enable row level security;
alter table public.product_bundle_items enable row level security;

drop policy if exists "公開讀取上架中的組合" on public.product_bundles;
create policy "公開讀取上架中的組合"
  on public.product_bundles for select
  using (is_active = true);

drop policy if exists "公開讀取上架中組合的成分" on public.product_bundle_items;
create policy "公開讀取上架中組合的成分"
  on public.product_bundle_items for select
  using (exists (
    select 1 from public.product_bundles b
    where b.id = bundle_id and b.is_active = true
  ));

-- ── 4. 原子性扣減 ────────────────────────────────────────────────────────
--
-- 回傳 true 代表全部成分都扣成功。任一成分不足就 RAISE，**整個交易回滾**，
-- 先前已扣的成分一併還原——這是「全成功或全不動」的來源，不要改成 return false，
-- 那樣前面已扣的會留下來。
--
-- 庫存欄位可為 NULL，語意是「不管控庫存」（與 orders/route.ts 的
-- `stock !== null && stock < qty` 一致），所以 NULL 不該擋下扣減。
--
create or replace function public.decrement_bundle_stock(
  p_bundle_id integer,
  p_qty       integer
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  item     record;
  need     integer;
  affected integer;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'decrement_bundle_stock: 數量必須為正整數（收到 %）', p_qty;
  end if;

  -- 沒有成分的組合是設定錯誤，不能當成扣減成功
  if not exists (select 1 from product_bundle_items where bundle_id = p_bundle_id) then
    raise exception 'decrement_bundle_stock: 組合 % 沒有任何成分', p_bundle_id;
  end if;

  for item in
    select bi.product_id, bi.spec, bi.quantity, p.name
    from product_bundle_items bi
    join products p on p.id = bi.product_id
    where bi.bundle_id = p_bundle_id
    order by bi.product_id, bi.spec   -- 固定順序，降低併發下的死結機率
  loop
    need := item.quantity * p_qty;

    if item.spec = '75g' then
      update products
         set stock_75g = case when stock_75g is null then null else stock_75g - need end
       where id = item.product_id
         and (stock_75g is null or stock_75g >= need);
    elsif item.spec = 'teabag' then
      update products
         set stock_tea_bag = case when stock_tea_bag is null then null else stock_tea_bag - need end
       where id = item.product_id
         and (stock_tea_bag is null or stock_tea_bag >= need);
    else  -- '150g'
      update products
         set stock_quantity = case when stock_quantity is null then null else stock_quantity - need end
       where id = item.product_id
         and (stock_quantity is null or stock_quantity >= need);
    end if;

    get diagnostics affected = row_count;
    if affected = 0 then
      -- 錯誤訊息帶商品名：前台要能告訴客人是哪一款成分不足（spec 的 Scenario 有要求）
      raise exception '庫存不足：% （%）', item.name, item.spec
        using errcode = 'P0001';
    end if;
  end loop;

  return true;
end;
$$;

-- 權限比照 decrement_stock／increment_stock：不是 SECURITY DEFINER，
-- 且只授 service_role。理由與攻擊面說明見 supabase/rpc-grants-remediation.sql
revoke execute on function public.decrement_bundle_stock(integer, integer) from public, anon, authenticated;
grant  execute on function public.decrement_bundle_stock(integer, integer) to service_role;

-- ── 驗證用 ───────────────────────────────────────────────────────────────
--   -- 函式不是 SECURITY DEFINER（應為 false）：
--   select proname, prosecdef from pg_proc
--   where proname = 'decrement_bundle_stock';
--
--   -- 誰能執行（應只有 service_role）：
--   select p.oid::regprocedure, p.proacl from pg_proc p
--   where p.proname = 'decrement_bundle_stock';
--
--   -- 可售量（取成分最小可組數）：
--   select b.id, b.name,
--          min(floor(
--            case bi.spec
--              when '75g'    then p.stock_75g
--              when 'teabag' then p.stock_tea_bag
--              else p.stock_quantity
--            end / bi.quantity
--          )) as 可售量
--   from product_bundles b
--   join product_bundle_items bi on bi.bundle_id = b.id
--   join products p on p.id = bi.product_id
--   group by b.id, b.name;
