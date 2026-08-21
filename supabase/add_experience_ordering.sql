-- ============================================================
-- 體驗與商品的排序 ＋ 體驗的季節區間
-- ============================================================
-- 用途：讓季節中的體驗（萬鷺朝鳳・茶山導覽 8/18–10/11、採茶與紅茶製作的
--       可採期）自動排到列表第一張，季節結束自動退回，不需要任何人記得去調。
--
-- 排序鍵（實作在 src/lib/experience-ordering.ts，不在資料庫）：
--       (釘選中, 季節中, sort_order, id)
--
-- 設計決策見 openspec/changes/experience-seasonal-ordering/design.md
--       D1 排序鍵順序／D2 釘選必須有到期日／D3 為什麼不建 view
--
-- 執行方式：本專案無 CLI migration 流程，由業主在 Supabase SQL editor
--       貼上本檔全文執行一次。全部可重複執行（IF NOT EXISTS）。
--
-- ⚠ 執行後**前台順序不會改變**：sort_order 全為預設 100、pinned_until 全為
--   NULL、季節表為空，排序退回 id 順序，與執行前完全相同。要看到效果必須
--   另外填入季節區間（見檔末的範例 INSERT）。
-- ============================================================

-- ── 1. 排序欄位 ──────────────────────────────────────────────
ALTER TABLE experience_types
  ADD COLUMN IF NOT EXISTS sort_order   INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS pinned_until DATE;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sort_order   INTEGER NOT NULL DEFAULT 100;

COMMENT ON COLUMN experience_types.sort_order IS
  '平時順序，小的在前；季節中與釘選中的體驗會排在它之前';
COMMENT ON COLUMN experience_types.pinned_until IS
  '臨時釘選到這一天（含）為止，過期自動失效。刻意不用 BOOLEAN——'
  '沒有到期日的置頂將來一定會忘記撤下，見 design.md D2';

-- ── 2. 季節區間 ──────────────────────────────────────────────
-- 一款體驗可有多段（採茶：3 月底–7 月底、9 月中–11 月底）。
-- 有設定區間的體驗＝白名單制：只有落在任一段內才算季節中。
-- 沒設定的體驗＝不受季節限制，行為與現在完全相同。
CREATE TABLE IF NOT EXISTS experience_availability_windows (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_type_id INTEGER     NOT NULL REFERENCES experience_types(id) ON DELETE CASCADE,
  start_date         DATE        NOT NULL,
  end_date           DATE        NOT NULL,
  note               TEXT,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT window_dates_ordered CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_availability_windows_type
  ON experience_availability_windows (experience_type_id, start_date);

-- 同一款體驗的區間不得重疊（後台要靠這條擋掉重複填寫）
CREATE EXTENSION IF NOT EXISTS btree_gist;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'availability_windows_no_overlap'
  ) THEN
    ALTER TABLE experience_availability_windows
      ADD CONSTRAINT availability_windows_no_overlap
      EXCLUDE USING gist (
        experience_type_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
      );
  END IF;
END $$;

-- ── 3. RLS ───────────────────────────────────────────────────
-- 與 web_inquiries 的 deny-by-default 不同：季節徽章要在前台顯示，
-- 匿名訪客必須讀得到。因此開放 SELECT，寫入仍只有 service_role。
ALTER TABLE experience_availability_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "季節區間可公開讀取" ON experience_availability_windows;
CREATE POLICY "季節區間可公開讀取"
  ON experience_availability_windows
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 填入季節區間（業主確認的日期；日後在後台調整即可）
-- ============================================================
-- 萬鷺朝鳳・茶山導覽：8/18–10/11（完整鳥況期）
-- 採茶與紅茶製作：3 月底–7 月底、9 月中–11 月底（業主註明「沒有很固定」，
--   以下為近似值，實際以後台調整為準；期間內也不是每天都能採，
--   最終仍由人工審核把關）
--
-- ⚠ 下面是 2026 年的區間。每年要續填——後台在最後一段結束日
--   距今不到 30 天時會顯示提醒。
-- ------------------------------------------------------------
INSERT INTO experience_availability_windows (experience_type_id, start_date, end_date, note)
SELECT et.id, w.start_date, w.end_date, w.note
FROM experience_types et
JOIN (VALUES
  ('cattle-egret-tour', DATE '2026-08-18', DATE '2026-10-11', '萬鷺朝鳳鳥況期'),
  ('tea-picking',       DATE '2026-03-25', DATE '2026-07-31', '春夏可採期'),
  ('tea-picking',       DATE '2026-09-15', DATE '2026-11-30', '秋冬可採期'),
  ('tea-making',        DATE '2026-03-25', DATE '2026-07-31', '春夏可採期（需有茶菁）'),
  ('tea-making',        DATE '2026-09-15', DATE '2026-11-30', '秋冬可採期（需有茶菁）')
) AS w(slug, start_date, end_date, note) ON w.slug = et.slug
ON CONFLICT DO NOTHING;
