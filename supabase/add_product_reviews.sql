-- ─────────────────────────────────────────────────────────────────────────
-- 商品評價：資料模型 ＋ RLS
--
-- 這張表是把體驗端跑很久的 `experience_reviews`（`sql/add_reviews_waitlist.sql`）
-- 搬到商品端，欄位刻意對齊，讓兩者未來能共用審核介面。
--
-- 設計要點（完整理由見 `openspec/changes/product-reviews/design.md`）：
--   * D1 獨立資料表，不與 experience_reviews 做多型關聯——兩邊的唯一性條件不同
--     （體驗是每筆預約一則、商品是每訂單每商品一則），硬塞同一張表會讓約束打架
--   * D2 `source` 必填。階段一由後台手動建檔既有口碑（LINE／FB），一律不是 'site'，
--     前台會顯示來源標註。**手動輸入的口碑若不標來源，等於偽造站內評價**
--   * D3 投稿階段才會用到的 `order_id` / `user_id` / UNIQUE 約束在這裡就建齊，
--     避免階段二再做一次 migration。階段一寫入時這兩欄為 NULL
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.product_reviews (
  id           uuid        primary key default gen_random_uuid(),
  product_id   integer     not null references public.products(id) on delete cascade,
  -- 階段二（站內投稿）才會寫入；階段一手動建檔為 NULL
  order_id     uuid        references public.orders(id) on delete set null,
  user_id      uuid        references auth.users(id) on delete set null,
  rating       smallint    not null check (rating between 1 and 5),
  comment      text,
  source       text        not null check (source in ('site', 'line', 'facebook', 'other')),
  -- 顯示名稱：手動建檔時填「王小姐」這類稱呼；站內投稿留 NULL 由前台顯示會員暱稱
  display_name text,
  -- 原始出處備註（例：2026-07-12 LINE 對話）。只給後台看，不上前台，用於追溯
  source_note  text,
  reviewed_at  date        not null default current_date,
  is_visible   boolean     not null default true,
  created_at   timestamptz not null default now()
);

comment on column public.product_reviews.source is
  '評價來源。site = 站內投稿（階段二）；其餘為業主手動建檔的既有口碑，前台會標明出處（design.md D2）';

comment on column public.product_reviews.source_note is
  '原始出處的自由文字，例如 LINE 對話日期。手動建檔的評價缺乏可驗證性，這欄是唯一的追溯線索';

-- 每筆訂單的每個商品只能留一則（階段二用；階段一 order_id 為 NULL，
-- Postgres 的 UNIQUE 不約束 NULL，所以手動建檔不受影響）
create unique index if not exists uniq_product_reviews_order_product
  on public.product_reviews (order_id, product_id)
  where order_id is not null;

-- 前台查詢方向：某商品的可見評價，新的在前
create index if not exists idx_product_reviews_product
  on public.product_reviews (product_id, is_visible, reviewed_at desc);

-- ── RLS：公開只讀得到 is_visible = true ──────────────────────────────────
-- 寫入一律走伺服器端（後台 API 用 service role），比照 product_bundles 不開
-- 匿名寫入政策。階段二的投稿 API 也在伺服器端驗證已購後才寫。
alter table public.product_reviews enable row level security;

drop policy if exists "公開讀取顯示中的商品評價" on public.product_reviews;
create policy "公開讀取顯示中的商品評價"
  on public.product_reviews for select
  using (is_visible = true);
