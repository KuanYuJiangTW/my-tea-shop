-- ================================================================
-- 茶藝體驗預約系統 Schema
-- 執行方式：貼到 Supabase SQL Editor 執行
-- ================================================================

-- ── 1. 體驗類型 ────────────────────────────────────────────────
CREATE TABLE experience_types (
  id                 SERIAL PRIMARY KEY,
  slug               TEXT NOT NULL UNIQUE,          -- 網址用，例如 "tea-ceremony"
  name               TEXT NOT NULL,                 -- 中文名稱
  name_en            TEXT NOT NULL,                 -- 英文名稱
  price              INTEGER NOT NULL,              -- 每人價格（元）
  duration_hours     NUMERIC(3,1) NOT NULL,         -- 時長（小時）
  max_participants   INTEGER NOT NULL DEFAULT 20,
  min_participants   INTEGER NOT NULL DEFAULT 4,
  requires_adult     BOOLEAN NOT NULL DEFAULT FALSE, -- 是否需要 18 歲以上（茶果酒）
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. 場次 ────────────────────────────────────────────────────
CREATE TABLE experience_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_type_id   INTEGER NOT NULL REFERENCES experience_types(id) ON DELETE CASCADE,
  session_date         DATE NOT NULL,
  start_time           TIME NOT NULL,               -- 10:00 或 14:00
  status               TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'full', 'cancelled')),
  current_participants INTEGER NOT NULL DEFAULT 0,
  cancel_reason        TEXT,                        -- 取消原因（颱風等）
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (experience_type_id, session_date, start_time)  -- 同一時段同一體驗不重複
);

-- ── 3. 預約 ─────────────────────────────────────────────────────
CREATE TABLE experience_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES experience_sessions(id) ON DELETE RESTRICT,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_count   INTEGER NOT NULL CHECK (participant_count >= 1),
  total_price         INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN ('pending_payment', 'confirmed', 'cancelled')),

  -- 訂購人資訊
  booker_name         TEXT NOT NULL,
  booker_phone        TEXT NOT NULL,
  booker_email        TEXT NOT NULL,
  dietary_notes       TEXT,                         -- 素食/特殊需求
  adult_confirmed     BOOLEAN NOT NULL DEFAULT FALSE, -- 茶果酒 18+ 確認

  -- 付款
  ecpay_trade_no      TEXT UNIQUE,
  paid_at             TIMESTAMPTZ,

  -- 取消/退款
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  refund_amount       INTEGER,
  refund_status       TEXT CHECK (refund_status IN ('none', 'pending', 'processed'))
                        DEFAULT 'none',

  -- 參加者資料補填截止（活動前 5 天）
  participants_due_at TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. 參加者資料 ───────────────────────────────────────────────
CREATE TABLE booking_participants (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID NOT NULL REFERENCES experience_bookings(id) ON DELETE CASCADE,
  is_primary              BOOLEAN NOT NULL DEFAULT FALSE,  -- 訂購人本人
  name                    TEXT NOT NULL,
  id_number               TEXT NOT NULL,                   -- 身分證號
  date_of_birth           DATE NOT NULL,
  emergency_contact_name  TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 預設體驗類型資料
-- ================================================================
INSERT INTO experience_types (slug, name, name_en, price, duration_hours, requires_adult) VALUES
  ('tea-ceremony',  '茶藝體驗',    'Tea Ceremony',         800, 2.0, FALSE),
  ('roasted-tea',   '烤茶',        'Roasted Tea',          450, 2.0, FALSE),
  ('tea-picking',   '採茶',        'Tea Picking',          450, 2.0, FALSE),
  ('tea-making',    '紅茶製作',    'Black Tea Making',     800, 3.0, FALSE),
  ('tea-wine',      '淺漬茶果酒',  'Tea Fruit Wine',       600, 2.0, TRUE);

-- ================================================================
-- Index（查詢加速）
-- ================================================================
CREATE INDEX idx_sessions_date       ON experience_sessions (session_date);
CREATE INDEX idx_sessions_type_date  ON experience_sessions (experience_type_id, session_date);
CREATE INDEX idx_bookings_session    ON experience_bookings (session_id);
CREATE INDEX idx_bookings_user       ON experience_bookings (user_id);
CREATE INDEX idx_bookings_status     ON experience_bookings (status);
CREATE INDEX idx_participants_booking ON booking_participants (booking_id);

-- ================================================================
-- Function：自動更新 session current_participants
-- 每次 booking 確認/取消時，重算該場次的報名人數
-- ================================================================
CREATE OR REPLACE FUNCTION update_session_participants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE experience_sessions
  SET current_participants = (
    SELECT COALESCE(SUM(participant_count), 0)
    FROM experience_bookings
    WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
      AND status = 'confirmed'
  ),
  status = CASE
    WHEN (
      SELECT COALESCE(SUM(participant_count), 0)
      FROM experience_bookings
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        AND status = 'confirmed'
    ) >= (
      SELECT max_participants FROM experience_types et
      JOIN experience_sessions es ON es.experience_type_id = et.id
      WHERE es.id = COALESCE(NEW.session_id, OLD.session_id)
    ) THEN 'full'
    ELSE 'open'
  END
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_participants
AFTER INSERT OR UPDATE OF status OR DELETE
ON experience_bookings
FOR EACH ROW
EXECUTE FUNCTION update_session_participants();
