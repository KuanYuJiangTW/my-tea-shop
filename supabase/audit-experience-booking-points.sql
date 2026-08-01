-- ============================================================================
-- 稽核：體驗預約（茶山體驗）的點數扣除與退還
--
-- 背景（2026-08-01 修正，見 openspec/specs/booking-cancellation/spec.md）
--   Bug 1：兩條取消路徑都以 experience_bookings.points_discount 為退還依據
--          （POST /api/bookings/[id]/cancel、POST /api/admin/experience-bookings/[id]/cancel）。
--          體驗預約在 2e1da44（2026-04-11）~ abae014 之間是舊制 100:1，
--          當時扣點寫的是 points_used（例：扣 3300 點、points_discount 只有 33），
--          所以取消時只退 33 點，吞掉客人 3267 點。
--          註：方向與商品訂單的舊 bug 相反——商品訂單當時帳本只扣 33。
--   Bug 2：POST /api/ecpay/experience-checkout 沒有防重複，同一筆預約每被呼叫
--          一次就扣一次點，但 points_used / points_discount 是覆蓋而非累加，
--          取消時只退得回一份。
--   結構性問題：點數在導向綠界「之前」就扣，客人放棄付款時預約會永遠停在
--          pending_payment，點數就這樣卡著（沒有清理 cron，見第 4 段）。
--
-- 用法：在 Supabase SQL Editor 逐段執行。前四段是唯讀盤點，
--       第五段是補償動作，確認金額後再自行取消註解執行。
--
-- 注意：d104048 之前，體驗的點數記錄誤寫進 point_transactions.order_id，
--       之後才改用 booking_id。以下每段都同時比對兩個欄位。
-- ============================================================================


-- ── 1. 已取消但少退點數的預約（主要清單，拿這張表補發）──────────────────────
--
-- 應退 = floor(帳本實扣 × 退款比例)，比例依取消當下距活動的時間決定。
-- cancelled_at 與場次時間都在 DB 裡，可以還原當時的級距。

WITH tx AS (
  SELECT
    COALESCE(booking_id::text, order_id::text)                 AS ref_id,
    user_id,
    SUM(CASE WHEN type = 'redeem' THEN -points ELSE 0 END)     AS deducted,
    SUM(CASE WHEN type = 'refund' THEN  points ELSE 0 END)     AS refunded_new,
    -- 舊制的退還記錄誤寫成 earn，靠 description 分辨
    SUM(CASE WHEN type = 'earn' AND description LIKE '%取消退還%'
             THEN points ELSE 0 END)                           AS refunded_old
  FROM point_transactions
  WHERE booking_id IS NOT NULL OR order_id IS NOT NULL
  GROUP BY COALESCE(booking_id::text, order_id::text), user_id
)
SELECT
  b.id                                    AS booking_id,
  b.created_at                            AS 預約時間,
  b.cancelled_at                          AS 取消時間,
  b.booker_name                           AS 訂購人,
  b.booker_email                          AS email,
  tx.user_id,
  b.points_used                           AS 預約記錄的使用點數,
  b.points_discount                       AS 折抵金額,
  tx.deducted                             AS 實際扣除,
  tx.refunded_new + tx.refunded_old       AS 已退還,
  EXTRACT(EPOCH FROM (
    (s.session_date + s.start_time) - b.cancelled_at
  )) / 3600                               AS 取消時距活動小時,
  CASE
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 168 THEN 1.0
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 72  THEN 0.5
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 24  THEN 0.2
    ELSE 0
  END                                     AS 適用退款比例,
  FLOOR(tx.deducted * CASE
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 168 THEN 1.0
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 72  THEN 0.5
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 24  THEN 0.2
    ELSE 0
  END) - (tx.refunded_new + tx.refunded_old) AS 應補發點數
FROM experience_bookings b
JOIN experience_sessions s ON s.id = b.session_id
JOIN tx ON tx.ref_id = b.id::text
WHERE b.status = 'cancelled'
  AND tx.deducted > 0
  AND FLOOR(tx.deducted * CASE
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 168 THEN 1.0
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 72  THEN 0.5
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 24  THEN 0.2
    ELSE 0
  END) > (tx.refunded_new + tx.refunded_old)
ORDER BY 應補發點數 DESC;


-- ── 2. 舊制預約清單（points_used ≠ points_discount）────────────────────────
--
-- 有列 = 線上確實存在 100:1 的舊資料，第 1 段的結果才需要當真。
-- 回 0 列 = 所有體驗預約都是新制 1:1，第 1 段只會抓到其他原因的差額。

SELECT
  b.id                AS booking_id,
  b.created_at        AS 預約時間,
  b.status,
  b.booker_email      AS email,
  b.points_used       AS 使用點數,
  b.points_discount   AS 折抵金額,
  b.total_price       AS 原價
FROM experience_bookings b
WHERE b.points_used > 0
  AND b.points_used <> b.points_discount
ORDER BY b.created_at;


-- ── 3. 同一筆預約被重複扣點（Bug 2 的受害者）────────────────────────────────
--
-- 正常情況每筆預約最多一筆 redeem。兩筆以上代表結帳被重打過。

SELECT
  COALESCE(booking_id::text, order_id::text) AS booking_id,
  user_id,
  COUNT(*)                                   AS redeem筆數,
  SUM(-points)                               AS 累計扣除,
  MIN(created_at)                            AS 首次,
  MAX(created_at)                            AS 最後一次
FROM point_transactions
WHERE type = 'redeem'
  AND (booking_id IS NOT NULL OR order_id IS NOT NULL)
GROUP BY COALESCE(booking_id::text, order_id::text), user_id
HAVING COUNT(*) > 1
ORDER BY 累計扣除 DESC;


-- ── 4. 點數卡在未付款預約裡（結構性問題）────────────────────────────────────
--
-- 這些客人扣了點但沒完成付款，預約永遠停在 pending_payment。
-- 除非他們自己進會員中心按取消，否則點數拿不回來。
-- 場次已經過去的（逾期）尤其該處理——那已經不可能再付款了。

SELECT
  b.id                AS booking_id,
  b.created_at        AS 預約時間,
  b.booker_name       AS 訂購人,
  b.booker_email      AS email,
  b.user_id,
  b.points_used       AS 卡住的點數,
  s.session_date      AS 場次日期,
  (s.session_date < CURRENT_DATE) AS 場次已過期
FROM experience_bookings b
JOIN experience_sessions s ON s.id = b.session_id
WHERE b.status = 'pending_payment'
  AND b.points_used > 0
ORDER BY b.created_at;


-- ── 5. 補償：補發第 1 段算出的差額（確認後再執行）──────────────────────────
--
-- 先跑第 1 段確認名單與金額，再取消下面的註解執行。
-- expires_at 給一年，與 issuePoints 一致。

/*
WITH tx AS (
  SELECT
    COALESCE(booking_id::text, order_id::text)             AS ref_id,
    user_id,
    SUM(CASE WHEN type = 'redeem' THEN -points ELSE 0 END) AS deducted,
    SUM(CASE WHEN type = 'refund' THEN  points ELSE 0 END)
      + SUM(CASE WHEN type = 'earn' AND description LIKE '%取消退還%'
                 THEN points ELSE 0 END)                   AS refunded
  FROM point_transactions
  WHERE booking_id IS NOT NULL OR order_id IS NOT NULL
  GROUP BY COALESCE(booking_id::text, order_id::text), user_id
),
owed AS (
  SELECT
    b.id AS booking_id,
    tx.user_id,
    FLOOR(tx.deducted * CASE
      WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 168 THEN 1.0
      WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 72  THEN 0.5
      WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 24  THEN 0.2
      ELSE 0
    END) - tx.refunded AS amount
  FROM experience_bookings b
  JOIN experience_sessions s ON s.id = b.session_id
  JOIN tx ON tx.ref_id = b.id::text
  WHERE b.status = 'cancelled' AND tx.deducted > 0
)
INSERT INTO point_transactions (user_id, points, type, booking_id, description, expires_at)
SELECT user_id, amount, 'refund', booking_id,
       '體驗預約取消退還點數（系統補發）', NOW() + INTERVAL '365 days'
FROM owed
WHERE amount > 0;
*/


-- ── 6. 複查：補發後的結果，應回 0 列 ────────────────────────────────────────
--
-- 第 5 段本身是冪等的：refunded 已包含補發寫進去的 refund 記錄，
-- 重跑時 amount 會算成 0 或負數而不插入，不會重複補發。

WITH tx AS (
  SELECT
    COALESCE(booking_id::text, order_id::text)             AS ref_id,
    user_id,
    SUM(CASE WHEN type = 'redeem' THEN -points ELSE 0 END) AS deducted,
    SUM(CASE WHEN type = 'refund' THEN  points ELSE 0 END)
      + SUM(CASE WHEN type = 'earn' AND description LIKE '%取消退還%'
                 THEN points ELSE 0 END)                   AS refunded
  FROM point_transactions
  WHERE booking_id IS NOT NULL OR order_id IS NOT NULL
  GROUP BY COALESCE(booking_id::text, order_id::text), user_id
)
SELECT
  b.id                              AS booking_id,
  b.booker_email                    AS email,
  tx.deducted                       AS 實際扣除,
  tx.refunded                       AS 已退還,
  FLOOR(tx.deducted * CASE
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 168 THEN 1.0
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 72  THEN 0.5
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 24  THEN 0.2
    ELSE 0
  END) - tx.refunded                AS 仍欠點數
FROM experience_bookings b
JOIN experience_sessions s ON s.id = b.session_id
JOIN tx ON tx.ref_id = b.id::text
WHERE b.status = 'cancelled'
  AND tx.deducted > 0
  AND FLOOR(tx.deducted * CASE
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 168 THEN 1.0
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 72  THEN 0.5
    WHEN EXTRACT(EPOCH FROM ((s.session_date + s.start_time) - b.cancelled_at)) / 3600 >= 24  THEN 0.2
    ELSE 0
  END) > tx.refunded
ORDER BY 仍欠點數 DESC;


-- ── 7. 診斷：舊制預約的帳本原貌 ─────────────────────────────────────────────
--
-- 用來回答「當年到底扣了哪個值、寫進哪個欄位、有沒有寫成功」。
-- LEFT JOIN 是刻意的：完全沒有帳本記錄的預約也要列出來（交易欄位為 NULL），
-- 那代表當時的 insert 被 order_id 的 FK 擋掉而靜默失敗（見 d104048）。
--
-- 已知的矛盾（2026-08-01 尚未解開）：程式碼從 2e1da44 到 d104048 寫的都是
-- `points: -pointsUsed`，但線上帳本記的是 points_discount 的量
-- （預約記錄 600 點、帳本只扣 6）。git 歷史解釋不了，需要這段的實際輸出。

SELECT
  b.id::text                    AS booking_id,
  b.created_at                  AS 預約時間,
  b.status,
  b.points_used                 AS 預約記錄使用點數,
  b.points_discount             AS 折抵金額,
  pt.created_at                 AS 交易時間,
  pt.type,
  pt.points,
  pt.description,
  (pt.booking_id IS NOT NULL)   AS 記在booking_id欄,
  (pt.order_id   IS NOT NULL)   AS 記在order_id欄
FROM experience_bookings b
LEFT JOIN point_transactions pt
  ON b.id::text = COALESCE(pt.booking_id::text, pt.order_id::text)
WHERE b.points_used > 0
  AND b.points_used <> b.points_discount
ORDER BY b.created_at, pt.created_at;
