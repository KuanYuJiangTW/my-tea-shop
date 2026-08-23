-- ============================================================
-- 萬鷺朝鳳半日（含等鳥茶席）— 新增體驗類型
--
-- 為什麼開新的一款、而不是在既有導覽上做「加購」：
--   加購要動 booking schema（品項、金額、退款分攤），是整套子系統；
--   而這裡真正要賣的是「不一樣的行程」——2 點到 6 點待著，茶席就是
--   等鳥那兩小時的內容。開新款只是一筆資料，客人也看得懂差別。
--   完整理由見 openspec/changes/experience-open-class-request/proposal.md「等鳥茶席」。
--
-- 與 450 元的單純導覽並存，讓客人自選：
--   萬鷺朝鳳・茶山導覽   450 元 / 1.5 小時 / 14:00 開始，看完就走
--   （導覽 2026-08-23 由 250 調回 450，見 adjust_experience_pricing.sql）
--   萬鷺朝鳳半日        650 元 / 4 小時   / 14:00–18:00，含等鳥茶席
--
-- 執行順序：本檔要在 add_experience_ordering.sql 之後跑。
--          add_experience_requests.sql 跑了沒都不影響（第 3 段自己判斷）。
--
-- ⚠ 刻意以 is_active = FALSE 建立：內容（照片、說明）還沒進 Sanity 之前
--   就上架，客人看到的會是一張沒有照片的空卡片。檔末有開啟的指令。
-- ============================================================

-- ── 1. 體驗類型 ──────────────────────────────────────────────
INSERT INTO experience_types
  (slug, name, name_en, price, duration_hours,
   max_participants, min_participants, requires_adult, is_active, sort_order)
VALUES
  ('egret-half-day',
   '萬鷺朝鳳半日・等鳥茶席',
   'Ten Thousand Egrets Half-Day with Tea Sitting',
   650, 4,
   -- 上限 12：茶席是圍著桌子坐的，人再多就變成兩批輪流，體驗會散掉
   12, 3, FALSE, FALSE, 100)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. 季節區間（與單純導覽一致的鳥況期）────────────────────
INSERT INTO experience_availability_windows (experience_type_id, start_date, end_date, note)
SELECT et.id, DATE '2026-08-22', DATE '2026-10-11', '萬鷺朝鳳鳥況期（與導覽一致）'
FROM experience_types et
WHERE et.slug = 'egret-half-day'
ON CONFLICT DO NOTHING;

-- ── 3. 客製開課參數（只有跑過 add_experience_requests.sql 才有這些欄位）──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'experience_types' AND column_name = 'accepts_requests'
  ) THEN
    UPDATE experience_types SET
      -- 維持關閉：逐款開啟的節奏見 tasks.md 10.5，茶藝體驗先上
      accepts_requests    = FALSE,
      request_min_slots   = 3,
      request_lead_days   = 7,
      -- 只有 14:00 一個時段——鳥要下午 3 點後才陸續進來，
      -- 上午開這一款等於賣一個看不到鳥的下午
      request_start_times = ARRAY['14:00']
    WHERE slug = 'egret-half-day';
  END IF;
END $$;

-- ── 4. 驗證 ──────────────────────────────────────────────────
SELECT et.slug, et.name, et.price, et.duration_hours,
       et.min_participants, et.max_participants, et.is_active,
       w.start_date, w.end_date
FROM experience_types et
LEFT JOIN experience_availability_windows w ON w.experience_type_id = et.id
WHERE et.slug IN ('egret-half-day', 'cattle-egret-tour')
ORDER BY et.slug;

-- ── 5. 內容備妥後，用這一行上架 ─────────────────────────────
-- UPDATE experience_types SET is_active = TRUE WHERE slug = 'egret-half-day';
