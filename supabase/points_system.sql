-- ═══════════════════════════════════════════════════════════════════════════════
-- 會員點數系統重構 — Database Migration
-- 執行前請先備份 point_transactions 和 orders 表
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. 會員等級���定表 ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_annual_spend INTEGER NOT NULL DEFAULT 0,
  points_rate NUMERIC(4,3) NOT NULL DEFAULT 0.02,
  max_discount_rate NUMERIC(3,2) NOT NULL DEFAULT 0.10,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO member_tiers (id, name, min_annual_spend, points_rate, max_discount_rate, sort_order)
VALUES
  ('standard', '一般會員', 0,    0.02, 0.10, 0),
  ('silver',   '銀卡會員', 3000, 0.03, 0.15, 1),
  ('gold',     '金卡會員', 8000, 0.04, 0.20, 2)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. 用戶會員資料表 ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_membership (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  tier_id TEXT NOT NULL DEFAULT 'standard' REFERENCES member_tiers(id),
  annual_spend INTEGER DEFAULT 0,
  annual_reset_at TIMESTAMPTZ,
  tier_upgraded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. 點數活動表 ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS points_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  campaign_type TEXT NOT NULL DEFAULT 'global',
  target_product_ids INTEGER[],
  target_tier_ids TEXT[],
  min_order_amount INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_multiplier CHECK (multiplier >= 1.0 AND multiplier <= 10.0),
  CONSTRAINT chk_campaign_type CHECK (campaign_type IN ('global', 'product', 'first_purchase', 'tier_specific'))
);

-- ─── 4. 修改 point_transactions 表 ──────────────────────────────────────���─────

ALTER TABLE point_transactions
  ADD COLUMN IF NOT EXISTS multiplier NUMERIC(3,1) DEFAULT 1.0;

ALTER TABLE point_transactions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 加入 refund type 支援（若 type 有 check constraint 需修改）
-- 注意：如果現有 check constraint 只允許 earn/redeem，需要加上 refund
DO $$
BEGIN
  -- 嘗試移除舊的 check constraint（如果存在）
  ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_type_check;
  -- 加上新的 check constraint
  ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_type_check
    CHECK (type IN ('earn', 'redeem', 'refund'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- ─── 5. 修改 orders 表：拆分折扣欄位 ───────────────────────────────────��──────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_discount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_discount INTEGER DEFAULT 0;

-- 注意��subtotal 欄位可能不存在，若不存在需要新增
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subtotal INTEGER;

-- CHECK constraint：確保金額恆等式（先修復舊資料後再 uncomment 啟用）
-- ALTER TABLE orders ADD CONSTRAINT chk_order_total
--   CHECK (total_amount = GREATEST(COALESCE(subtotal,0) + COALESCE(shipping_fee,0) - coupon_discount - points_discount, 0));

-- ─── 6. 修改 experience_bookings 表 ──────────────────────────────────────────

ALTER TABLE experience_bookings
  ADD COLUMN IF NOT EXISTS coupon_discount INTEGER DEFAULT 0;

-- ─── 7. 通用碼折價券模板表 ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupon_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_amount INTEGER NOT NULL,
  min_order_amount INTEGER DEFAULT 0,
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. 通用碼使用記錄表 ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES coupon_templates(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID,
  booking_id UUID,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, user_id, order_id)
);

-- ─── 9. 資料遷移：舊點數 100:1 → 1:1 ────────────────────────────────────────

-- 先標記���些已遷移
ALTER TABLE point_transactions
  ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

-- 執行遷移（除以 100，四捨五入）
UPDATE point_transactions
SET
  points = ROUND(points::numeric / 100),
  migrated_at = NOW()
WHERE migrated_at IS NULL
  AND ABS(points) >= 100;

-- 小於 100 的點數（如果有）直接設為 0 或 1
UPDATE point_transactions
SET
  points = CASE WHEN points > 0 THEN GREATEST(ROUND(points::numeric / 100), 0) ELSE LEAST(ROUND(points::numeric / 100), 0) END,
  migrated_at = NOW()
WHERE migrated_at IS NULL
  AND ABS(points) < 100
  AND ABS(points) > 0;

-- ─── 10. 資料遷移：backfill orders 折扣欄位 ──────────────────────────────────

UPDATE orders
SET
  points_discount = COALESCE(ROUND(points_used::numeric / 100), 0),
  coupon_discount = COALESCE(discount_amount, 0) - COALESCE(ROUND(points_used::numeric / 100), 0),
  subtotal = (
    SELECT COALESCE(SUM((item->>'subtotal')::integer), 0)
    FROM jsonb_array_elements(items::jsonb) AS item
  )
WHERE coupon_discount = 0 AND points_discount = 0 AND discount_amount > 0;

-- orders 沒有折扣的也填�� subtotal
UPDATE orders
SET subtotal = (
  SELECT COALESCE(SUM((item->>'subtotal')::integer), 0)
  FROM jsonb_array_elements(items::jsonb) AS item
)
WHERE subtotal IS NULL;

-- ─── 11. 為現有用戶建立 membership ───────────────────────────────────────���──

INSERT INTO user_membership (user_id, tier_id, annual_spend)
SELECT
  u.id,
  CASE
    WHEN COALESCE(spend.total, 0) >= 8000 THEN 'gold'
    WHEN COALESCE(spend.total, 0) >= 3000 THEN 'silver'
    ELSE 'standard'
  END,
  COALESCE(spend.total, 0)
FROM auth.users u
LEFT JOIN (
  SELECT user_id, SUM(total_amount) as total
  FROM orders
  WHERE order_status = 'completed'
    AND created_at >= date_trunc('year', NOW())
  GROUP BY user_id
) spend ON spend.user_id = u.id
WHERE u.id NOT IN (SELECT user_id FROM user_membership)
ON CONFLICT (user_id) DO NOTHING;
