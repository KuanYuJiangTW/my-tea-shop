-- ============================================================
-- 萬鷺朝鳳半日（含等鳥茶席）— 已建立，但**決定不上架**
--
-- ⚠ 這支已經跑過了。資料庫裡確實有這一筆，`is_active = FALSE`，
--   前台看不到。保留本檔是為了記錄它長什麼樣子，不是為了叫你上架。
--
-- ── 為什麼不上架（2026-08-23 決定）────────────────────────────
--
-- 它其實沒有多賣任何東西。核心內容（一壺可續水的茶、每人一份小點）
-- 在 450 元導覽上用現場加購就拿得到，而且更便宜：
--
--   3 人 · 450 導覽 ＋ 一壺 300 ＋ 小點 3×50 = 1,800
--   3 人 · 650 半日 × 3                      = 1,950
--
-- 內容一樣、價格更高，還多一個要維護的商品、要排的場次、要寫的內容。
-- 等鳥茶席的概念活下來了，但它是**現場加購**，不是可預約的商品。
-- 線上維持 0（免費賞鳥）／150（看鳥茶位）／450（導覽）三層。
-- 完整推導見 openspec/changes/experience-open-class-request/
-- egret-pricing-and-onsite-copy.md
--
-- ── 如果將來又要做 ──────────────────────────────────────────
-- 不要直接把這筆打開。先回去看上面那個算式還成不成立——它成不成立
-- 取決於現場加購的定價，而不是取決於這個商品本身。真的要做的話，
-- 前台備援內容（src/lib/experiences.ts 的 FALLBACK_CONTENT）也要一併補回，
-- 否則 Sanity 沒建內容時該頁會直接 404。
-- ============================================================

-- ── 當初建立時跑的內容（保留供參，重跑不會有變化）──────────
INSERT INTO experience_types
  (slug, name, name_en, price, duration_hours,
   max_participants, min_participants, requires_adult, is_active, sort_order)
VALUES
  ('egret-half-day',
   '萬鷺朝鳳半日・等鳥茶席',
   'Ten Thousand Egrets Half-Day with Tea Sitting',
   650, 4,
   12, 3, FALSE, FALSE, 100)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO experience_availability_windows (experience_type_id, start_date, end_date, note)
SELECT et.id, DATE '2026-08-22', DATE '2026-10-11', '萬鷺朝鳳鳥況期（與導覽一致）'
FROM experience_types et
WHERE et.slug = 'egret-half-day'
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'experience_types' AND column_name = 'accepts_requests'
  ) THEN
    UPDATE experience_types SET
      accepts_requests    = FALSE,
      request_min_slots   = 3,
      request_lead_days   = 7,
      request_start_times = ARRAY['14:00']
    WHERE slug = 'egret-half-day';
  END IF;
END $$;

-- ── 確認它仍然是關著的 ──────────────────────────────────────
-- 預期：is_active = false。若查出來是 true，代表有人把它打開了，
-- 請回去讀本檔開頭那段。
SELECT slug, price, min_participants, is_active
FROM experience_types
WHERE slug = 'egret-half-day';
