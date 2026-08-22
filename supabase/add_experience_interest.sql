-- ============================================================
-- experience_interest — 「找不到適合的日期」與「季節外通知我」的需求訊號
-- ============================================================
-- 用途：客製開課請求（openspec/changes/experience-open-class-request）的
--       **Phase 0 輕量版**。只收訊號，不做審核工作流——沒有狀態機、沒有
--       token、沒有排程、沒有替代方案。完整版另有 experience_requests，
--       兩者是不同的東西：這裡是「有人想要」，那裡是「一筆待審的申請」。
--
--       同一張表也給 experience-seasonal-ordering 的「季節外・開放時通知我」
--       用（source = 'off-season'），兩邊共用避免蓋兩張長得一樣的表。
--
-- RLS：啟用且刻意不建立任何 anon/authenticated policy（deny by default），
--       讀寫一律經 API route 的 service_role client，比照 web_inquiries。
--
-- 執行方式：本專案無 CLI migration 流程，由業主在 Supabase SQL editor
--       貼上本檔全文執行一次。可重複執行。
-- ============================================================

CREATE TABLE IF NOT EXISTS experience_interest (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_type_id INTEGER     NOT NULL REFERENCES experience_types(id) ON DELETE CASCADE,

  -- 聯絡方式：email 與 line 至少填一個（由 API 驗證，DB 也擋一層）
  contact_email      text,
  contact_line       text,

  preferred_date     date,       -- 想要的日期（選填；季節外通知的情境不會有）
  headcount          integer,    -- 大概幾個人（選填）
  note               text,       -- 備註（選填）

  source             text        NOT NULL DEFAULT 'no-date',  -- no-date | off-season
  locale             text        NOT NULL DEFAULT 'zh',

  -- 業主看過並處理了（後台勾一下）。刻意用時間戳而非布林：
  -- 之後想知道「多久回覆一次」時，布林值救不回來
  handled_at         timestamptz,

  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT interest_has_contact CHECK (
    coalesce(btrim(contact_email), '') <> '' OR coalesce(btrim(contact_line), '') <> ''
  ),
  CONSTRAINT interest_headcount_range CHECK (
    headcount IS NULL OR (headcount >= 1 AND headcount <= 50)
  ),
  CONSTRAINT interest_source_valid CHECK (source IN ('no-date', 'off-season'))
);

-- 後台清單的預設排序：未處理的、新的在前
CREATE INDEX IF NOT EXISTS idx_experience_interest_pending
  ON experience_interest (created_at DESC)
  WHERE handled_at IS NULL;

-- 「哪個體驗、哪些日期最多人問」的彙總查詢
CREATE INDEX IF NOT EXISTS idx_experience_interest_type_date
  ON experience_interest (experience_type_id, preferred_date);

-- 同一個 email 對同一體驗＋同一日期只留一筆，避免重複送出灌爆清單。
-- preferred_date 為 NULL 時（季節外通知）用 coalesce 收斂成同一鍵
CREATE UNIQUE INDEX IF NOT EXISTS uq_experience_interest_dedupe
  ON experience_interest (
    experience_type_id,
    lower(btrim(coalesce(contact_email, contact_line))),
    coalesce(preferred_date, DATE '1900-01-01')
  );

ALTER TABLE experience_interest ENABLE ROW LEVEL SECURITY;
