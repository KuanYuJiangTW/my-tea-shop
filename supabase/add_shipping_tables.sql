-- ============================================================
-- International Shipping: shipping_zones + shipping_countries
-- ============================================================

-- 1. shipping_zones — ePacket 7 運費區域
CREATE TABLE IF NOT EXISTS shipping_zones (
  zone_code       TEXT PRIMARY KEY,          -- e.g. 'asia_1'
  zone_name       TEXT NOT NULL,             -- 中文名稱
  zone_name_en    TEXT NOT NULL,             -- English name
  base_fee        INTEGER NOT NULL,          -- 起重費 (100g), 單位 NT$
  per_extra       INTEGER NOT NULL,          -- 續重費 (每 100g), 單位 NT$
  estimated_days_min INTEGER NOT NULL DEFAULT 7,
  estimated_days_max INTEGER NOT NULL DEFAULT 14,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. shipping_countries — 國家與區域對照
CREATE TABLE IF NOT EXISTS shipping_countries (
  country_code    TEXT PRIMARY KEY,          -- ISO 3166-1 alpha-2
  country_name    TEXT NOT NULL,             -- 中文名稱
  country_name_en TEXT NOT NULL,             -- English name
  zone_code       TEXT NOT NULL REFERENCES shipping_zones(zone_code),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_countries_zone ON shipping_countries(zone_code);

-- 3. RLS — public read access
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read shipping_zones"
  ON shipping_zones FOR SELECT
  USING (true);

CREATE POLICY "Public read shipping_countries"
  ON shipping_countries FOR SELECT
  USING (true);

-- 4. products 表新增配送重量欄位
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_weight_150g INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_weight_75g INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_weight_teabag INTEGER;

-- ============================================================
-- Seed Data: ePacket 7 區費率 + 18 國家
-- ============================================================

-- 5. 插入運費區域
INSERT INTO shipping_zones (zone_code, zone_name, zone_name_en, base_fee, per_extra, estimated_days_min, estimated_days_max) VALUES
  ('asia_1',    '東亞及東南亞 I',  'East & SE Asia I',  100, 20, 7,  10),
  ('asia_2',    '東亞及東南亞 II', 'East & SE Asia II', 120, 20, 7,  14),
  ('west_asia', '西亞',            'West Asia',         160, 25, 10, 18),
  ('europe_1',  '歐洲 I',         'Europe I',          140, 25, 10, 14),
  ('europe_2',  '歐洲 II',        'Europe II',         160, 25, 10, 18),
  ('oceania',   '大洋洲',          'Oceania',           180, 25, 10, 14),
  ('americas',  '美洲',            'Americas',          190, 30, 10, 21)
ON CONFLICT (zone_code) DO NOTHING;

-- 6. 插入國家對照
INSERT INTO shipping_countries (country_code, country_name, country_name_en, zone_code) VALUES
  -- asia_1
  ('JP', '日本',     'Japan',       'asia_1'),
  ('SG', '新加坡',   'Singapore',   'asia_1'),
  ('TH', '泰國',     'Thailand',    'asia_1'),
  ('VN', '越南',     'Vietnam',     'asia_1'),
  -- asia_2
  ('ID', '印尼',     'Indonesia',   'asia_2'),
  ('KR', '韓國',     'South Korea', 'asia_2'),
  ('MY', '馬來西亞', 'Malaysia',    'asia_2'),
  ('PH', '菲律賓',   'Philippines', 'asia_2'),
  -- west_asia
  ('IL', '以色列',   'Israel',      'west_asia'),
  -- europe_1
  ('DE', '德國',     'Germany',     'europe_1'),
  -- europe_2
  ('FR', '法國',     'France',      'europe_2'),
  ('GB', '英國',     'United Kingdom', 'europe_2'),
  ('NO', '挪威',     'Norway',      'europe_2'),
  ('PL', '波蘭',     'Poland',      'europe_2'),
  ('DK', '丹麥',     'Denmark',     'europe_2'),
  -- oceania
  ('NZ', '紐西蘭',   'New Zealand', 'oceania'),
  ('AU', '澳洲',     'Australia',   'oceania'),
  -- americas
  ('US', '美國',     'United States', 'americas'),
  ('CA', '加拿大',   'Canada',      'americas')
ON CONFLICT (country_code) DO NOTHING;
