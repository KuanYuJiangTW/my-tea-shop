-- ─── experience_reviews ────────────────────────────────────────────────────────
-- 每筆預約只能留一筆評價（UNIQUE booking_id）
-- is_visible 供後台軟刪除

CREATE TABLE IF NOT EXISTS experience_reviews (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           uuid        NOT NULL UNIQUE REFERENCES experience_bookings(id) ON DELETE CASCADE,
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_type_id   int         NOT NULL REFERENCES experience_types(id),
  rating               smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment              text,
  is_visible           boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_experience_type
  ON experience_reviews(experience_type_id, is_visible, created_at DESC);

-- RLS
ALTER TABLE experience_reviews ENABLE ROW LEVEL SECURITY;

-- 任何人可讀取可見評價
CREATE POLICY "public read visible reviews"
  ON experience_reviews FOR SELECT
  USING (is_visible = true);

-- 已登入使用者可新增自己的評價
CREATE POLICY "user insert own review"
  ON experience_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── waitlist_entries ───────────────────────────────────────────────────────────
-- status: waiting → notified → confirmed | expired | cancelled

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid        NOT NULL REFERENCES experience_sessions(id) ON DELETE CASCADE,
  user_id           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  booker_name       text        NOT NULL,
  booker_phone      text        NOT NULL,
  booker_email      text        NOT NULL,
  participant_count int         NOT NULL DEFAULT 1,
  dietary_notes     text,
  adult_confirmed   boolean     NOT NULL DEFAULT false,
  status            text        NOT NULL DEFAULT 'waiting'
                                CHECK (status IN ('waiting', 'notified', 'confirmed', 'expired', 'cancelled')),
  notified_at       timestamptz,
  confirm_deadline  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_session_status
  ON waitlist_entries(session_id, status, created_at);

-- 加在 experience_sessions 的候補人數欄位（方便前台顯示）
ALTER TABLE experience_sessions
  ADD COLUMN IF NOT EXISTS waitlist_count int NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user read own waitlist"
  ON waitlist_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user insert own waitlist"
  ON waitlist_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── RPC：候補人數計數（繞過 RLS，供 API routes 使用）────────────────────────────

CREATE OR REPLACE FUNCTION increment_waitlist_count(session_id_arg uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE experience_sessions
     SET waitlist_count = waitlist_count + 1
   WHERE id = session_id_arg;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_waitlist_count(session_id_arg uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE experience_sessions
     SET waitlist_count = GREATEST(0, waitlist_count - 1)
   WHERE id = session_id_arg;
END;
$$;
