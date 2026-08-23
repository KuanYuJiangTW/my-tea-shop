-- ============================================================
-- 客製開課請求（完整版）— experience_requests 及其周邊
-- ============================================================
-- 規格：openspec/changes/experience-open-class-request/
--       設計決策見 design.md：D1 不收訂金／D2 免登入＋token／D3 開團最低名額
--       ／D4 核准即建場次＋visibility／D5 狀態機／D9 RLS／D11 可申請期間
--       ／D12 時段白名單是每款體驗自己的
--
-- 與 Phase 0 的 experience_interest 是**不同的東西**：
--   experience_interest = 「有人想要」的訊號，只收不審
--   experience_requests = 「一筆待審的申請」，有狀態機、有 token、會建場次
-- 兩張表都留著，各自解決不同的事。
--
-- 執行方式：本專案無 CLI migration 流程，由業主在 Supabase SQL editor
--       貼上本檔全文執行一次。全部可重複執行。
--
-- ⚠ 執行後前台**不會有任何變化**：experience_types.accepts_requests 全部
--   預設 false，等同功能未上線。要開啟請逐款設為 true（見檔末）。
-- ============================================================

-- ── 1. experience_types：可申請性的參數 ──────────────────────
ALTER TABLE experience_types
  ADD COLUMN IF NOT EXISTS accepts_requests    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS request_min_slots   INTEGER,
  ADD COLUMN IF NOT EXISTS request_lead_days   INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS request_start_times TEXT[]  NOT NULL DEFAULT ARRAY['10:00', '14:00'];

COMMENT ON COLUMN experience_types.accepts_requests IS
  '這款體驗是否開放客製開課請求。預設 false＝功能對這款而言未上線，可逐款開啟';
COMMENT ON COLUMN experience_types.request_min_slots IS
  '開團最低名額數（整數）。客人付 request_min_slots × price，換到的是該時段的這些名額，'
  '愛帶幾個人由他決定。用名額數而非金額：金額要換算才看得懂，也會跑出 2.4 人這種數字';
COMMENT ON COLUMN experience_types.request_start_times IS
  '這款體驗可申請的時段白名單。**刻意做成每款自己的**——萬鷺朝鳳走黃昏鳥況，'
  '時段跟其他五款不同；寫成全站常數等於在資料層擋死一款商品';

-- ── 2. experience_sessions：可見性與來源 ─────────────────────
-- 核准請求時建立的場次先是 private（只有拿到專屬連結的人看得到），
-- 申請人付款後若非包場才轉 public 開放併團。既有場次自動是 public，行為不變。
ALTER TABLE experience_sessions
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS created_from_request_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'experience_sessions_visibility_check') THEN
    ALTER TABLE experience_sessions
      ADD CONSTRAINT experience_sessions_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;
END $$;

-- ── 3. 可申請期間（季節）────────────────────────────────────
-- 與 experience-seasonal-ordering 共用同一張表。該 change 若已上線，
-- 這一段是 no-op。有設定 window 的體驗＝白名單制，沒設定＝不限期間。
CREATE TABLE IF NOT EXISTS experience_availability_windows (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_type_id INTEGER     NOT NULL REFERENCES experience_types(id) ON DELETE CASCADE,
  start_date         DATE        NOT NULL,
  end_date           DATE        NOT NULL,
  note               TEXT,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT window_dates_ordered CHECK (end_date >= start_date)
);

-- ── 4. 公休／黑名單日期 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS experience_blackout_dates (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blackout_date DATE        NOT NULL UNIQUE,
  reason        TEXT,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 5. 請求主檔 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experience_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 給客人的查詢編號，人可讀（如 R2608-0001）。與 token 分開：
  -- 編號可以在電話裡念，token 不行
  request_no          TEXT        NOT NULL UNIQUE,

  experience_type_id  INTEGER     NOT NULL REFERENCES experience_types(id) ON DELETE CASCADE,
  preferred_date      DATE        NOT NULL,
  preferred_start_time TIME       NOT NULL,
  alt_date            DATE,
  alt_start_time      TIME,

  headcount           INTEGER     NOT NULL,
  is_private          BOOLEAN     NOT NULL DEFAULT FALSE,   -- 想包場，不與他人併團

  -- 聯絡資訊（免登入即可申請，見 design.md D2）
  contact_name        TEXT        NOT NULL,
  contact_phone       TEXT        NOT NULL,
  contact_email       TEXT        NOT NULL,
  contact_line        TEXT,
  contact_preference  TEXT,
  contact_time        TEXT,
  note                TEXT,

  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  locale              TEXT        NOT NULL DEFAULT 'zh',

  -- 狀態機（design.md D5）。converted 是終局：已變成一筆真實預約
  status              TEXT        NOT NULL DEFAULT 'pending',

  -- 自助查詢／撤回／選替代方案／預約，共用同一個不可猜的 token
  token               TEXT        NOT NULL UNIQUE,
  token_expires_at    timestamptz,

  session_id          uuid        REFERENCES experience_sessions(id) ON DELETE SET NULL,
  -- 指向真實預約。ON DELETE SET NULL 而非 RESTRICT：預約被刪時請求該留著，
  -- 它是「曾經有人申請過」的紀錄，不該被下游刪除連坐
  booking_id          uuid        REFERENCES experience_bookings(id) ON DELETE SET NULL,

  admin_note          TEXT,       -- 只有管理員看得到，不得出現在客人端回應或信件
  decline_reason      TEXT,
  reviewed_at         timestamptz,
  reviewed_by         uuid,

  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT request_status_valid CHECK (status IN (
    'pending', 'approved', 'alternative_offered', 'declined',
    'expired', 'withdrawn', 'converted'
  )),
  CONSTRAINT request_headcount_range CHECK (headcount >= 1 AND headcount <= 50)
);

COMMENT ON COLUMN experience_requests.admin_note IS
  '內部備註。MUST NOT 出現在任何客人端 API 回應或寄給客人的信件';

-- ── 6. 替代方案候選 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experience_request_alternatives (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          uuid        NOT NULL REFERENCES experience_requests(id) ON DELETE CASCADE,
  alt_date            DATE        NOT NULL,
  alt_start_time      TIME        NOT NULL,
  -- 指向既有場次時代表「請客人加入這一場」，而不是為他另開一場
  existing_session_id uuid        REFERENCES experience_sessions(id) ON DELETE SET NULL,
  sort_order          INTEGER     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 7. 索引 ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_experience_requests_status
  ON experience_requests (status, created_at DESC);

-- 後台的聚合視圖靠這條：同一體驗、同一日期、同一時段的多筆請求要能一起撈出來
CREATE INDEX IF NOT EXISTS idx_experience_requests_grouping
  ON experience_requests (experience_type_id, preferred_date, preferred_start_time);

CREATE INDEX IF NOT EXISTS idx_experience_requests_token
  ON experience_requests (token);

-- 同一 Email 對同一體驗＋日期＋時段只能有一筆「還活著」的申請。
-- 只擋 pending／approved／alternative_offered——已婉拒或撤回之後應該可以重新申請，
-- 否則客人被拒一次就永遠不能再問同一天
CREATE UNIQUE INDEX IF NOT EXISTS uq_experience_requests_active
  ON experience_requests (
    experience_type_id, lower(btrim(contact_email)), preferred_date, preferred_start_time
  )
  WHERE status IN ('pending', 'approved', 'alternative_offered');

CREATE INDEX IF NOT EXISTS idx_request_alternatives_request
  ON experience_request_alternatives (request_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_availability_windows_type
  ON experience_availability_windows (experience_type_id, start_date);

-- ── 8. RLS：deny by default（design.md D9）────────────────────
-- 三張新表一律不建立 anon/authenticated policy，讀寫只能經 API route 的
-- service_role client。客人的自助查詢走 API＋token，不讓瀏覽器直連。
--
-- 例外：experience_availability_windows 需要匿名讀取（前台季節徽章要用），
-- 那條 policy 由 add_experience_ordering.sql 建立，這裡不重複也不移除。
ALTER TABLE experience_requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_request_alternatives  ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_blackout_dates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_availability_windows  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 參數初始值（業主 2026-08-21 確認成本後定案）
-- ============================================================
-- 開團最低名額：採茶 4／烤茶 4／茶藝 4／淺漬茶果酒 4／萬鷺朝鳳 3／紅茶製作 6
--   茶藝 2 人只賺 20 元（外聘茶藝師 1,500／場）、紅茶是業主＋鄰居兩人帶，
--   萬鷺朝鳳只佔 3 小時且材料最省——理由見 proposal 的淨貢獻表。
-- ------------------------------------------------------------
UPDATE experience_types SET request_min_slots = 4 WHERE slug IN
  ('tea-picking', 'roasted-tea', 'tea-ceremony', 'tea-wine');
UPDATE experience_types SET request_min_slots = 3 WHERE slug = 'cattle-egret-tour';
UPDATE experience_types SET request_min_slots = 6 WHERE slug = 'tea-making';

-- 萬鷺朝鳳只排 14:00：鳥況是 15:00–18:00，早上場看不到鳥
UPDATE experience_types SET request_start_times = ARRAY['14:00']
  WHERE slug = 'cattle-egret-tour';

-- accepts_requests 全部維持 false——要開啟時逐款執行，例如：
--   UPDATE experience_types SET accepts_requests = TRUE WHERE slug = 'tea-ceremony';
