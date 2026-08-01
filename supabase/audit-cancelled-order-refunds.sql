-- ============================================================================
-- 稽核：取消訂單時少退的點數 / 未還原的通用碼
--
-- 背景（2026-08-01 修正，見 openspec/specs/coupon-and-points/spec.md）
--   Bug 1：POST /api/orders/[id]/cancel（會員自己在會員中心按取消）的 SELECT
--          漏撈 points_discount，退點金額一律落到舊制 fallback
--          `floor(points_used / 100)`，也就是只退 1%。
--          後台取消（PATCH /api/admin/orders/[id]）不受影響。
--   Bug 2：兩條取消路徑都沒有刪除 coupon_usages，通用碼取消後永久佔用
--          該使用者的 max_uses_per_user 與活動總量 max_uses。
--
-- 用法：在 Supabase SQL Editor 逐段執行。前四段是唯讀盤點，
--       第五、六段是補償動作，確認金額後再自行取消註解執行。
-- ============================================================================


-- ── 1. 少退點數的訂單明細（主要清單，拿這張表補發）──────────────────────────
--
-- 對每筆已取消訂單，比對「扣除的點數」與「退還的點數」。
-- redeem 記在 point_transactions 是負值，這裡取絕對值。

WITH tx AS (
  SELECT
    order_id,
    user_id,
    SUM(CASE WHEN type = 'redeem' THEN -points ELSE 0 END) AS deducted,
    SUM(CASE WHEN type = 'refund' THEN  points ELSE 0 END) AS refunded
  FROM point_transactions
  WHERE order_id IS NOT NULL
  GROUP BY order_id, user_id
)
SELECT
  o.id                                   AS order_id,
  o.created_at                           AS 下單時間,
  o.customer_name                        AS 客戶,
  o.customer_email                       AS email,
  tx.user_id,
  o.points_used                          AS 訂單記錄的使用點數,
  o.points_discount                      AS 折抵金額,
  tx.deducted                            AS 實際扣除,
  tx.refunded                            AS 實際退還,
  tx.deducted - tx.refunded              AS 應補發點數
FROM orders o
JOIN tx ON tx.order_id = o.id
WHERE o.order_status = 'cancelled'
  AND tx.deducted > 0
  AND tx.deducted - tx.refunded > 0      -- 只列出退少了的
ORDER BY (tx.deducted - tx.refunded) DESC, o.created_at DESC;


-- ── 2. 一句話總結：影響幾人、幾筆、共欠多少點 ───────────────────────────────

WITH tx AS (
  SELECT order_id, user_id,
         SUM(CASE WHEN type = 'redeem' THEN -points ELSE 0 END) AS deducted,
         SUM(CASE WHEN type = 'refund' THEN  points ELSE 0 END) AS refunded
  FROM point_transactions
  WHERE order_id IS NOT NULL
  GROUP BY order_id, user_id
)
SELECT
  COUNT(*)                            AS 受影響訂單數,
  COUNT(DISTINCT tx.user_id)          AS 受影響會員數,
  SUM(tx.deducted - tx.refunded)      AS 應補發點數總計
FROM orders o
JOIN tx ON tx.order_id = o.id
WHERE o.order_status = 'cancelled'
  AND tx.deducted > 0
  AND tx.deducted - tx.refunded > 0;


-- ── 3. 每位會員應補發多少（依此逐人補發）──────────────────────────────────

WITH tx AS (
  SELECT order_id, user_id,
         SUM(CASE WHEN type = 'redeem' THEN -points ELSE 0 END) AS deducted,
         SUM(CASE WHEN type = 'refund' THEN  points ELSE 0 END) AS refunded
  FROM point_transactions
  WHERE order_id IS NOT NULL
  GROUP BY order_id, user_id
)
SELECT
  tx.user_id,
  MIN(o.customer_email)               AS email,
  COUNT(*)                            AS 筆數,
  SUM(tx.deducted - tx.refunded)      AS 應補發點數
FROM orders o
JOIN tx ON tx.order_id = o.id
WHERE o.order_status = 'cancelled'
  AND tx.deducted > 0
  AND tx.deducted - tx.refunded > 0
GROUP BY tx.user_id
ORDER BY 應補發點數 DESC;


-- ── 4. Bug 2：已取消訂單但通用碼記錄還留著 ─────────────────────────────────
--
-- 這些 coupon_usages 正在白白佔用使用者的額度與活動總量。

SELECT
  cu.id                AS usage_id,
  cu.template_id,
  ct.code              AS 折價碼,
  cu.user_id,
  cu.order_id,
  o.order_status,
  o.created_at         AS 下單時間
FROM coupon_usages cu
JOIN orders o           ON o.id = cu.order_id
LEFT JOIN coupon_templates ct ON ct.id = cu.template_id
WHERE o.order_status = 'cancelled'
ORDER BY o.created_at DESC;


-- ── 5. 補償動作 A：補發少退的點數 ───────────────────────────────────────────
--
-- ⚠ 先跑第 1、2 段確認金額，再取消註解執行。
-- 有效期比照 refundPoints 的既有行為（不設 expires_at，跟現行退點一致）。
-- description 帶 'refund' type，會直接計入餘額。
--
-- 這段有防重複：description 用固定字串，重跑前先看第 6 段確認沒有重複補發。

/*
WITH tx AS (
  SELECT order_id, user_id,
         SUM(CASE WHEN type = 'redeem' THEN -points ELSE 0 END) AS deducted,
         SUM(CASE WHEN type = 'refund' THEN  points ELSE 0 END) AS refunded
  FROM point_transactions
  WHERE order_id IS NOT NULL
  GROUP BY order_id, user_id
)
INSERT INTO point_transactions (user_id, points, type, order_id, description)
SELECT
  tx.user_id,
  tx.deducted - tx.refunded,
  'refund',
  o.id,
  '取消訂單退點修正補發（2026-08-01）'
FROM orders o
JOIN tx ON tx.order_id = o.id
WHERE o.order_status = 'cancelled'
  AND tx.deducted > 0
  AND tx.deducted - tx.refunded > 0
  -- 防重複：這筆訂單還沒被補發過
  AND NOT EXISTS (
    SELECT 1 FROM point_transactions p
    WHERE p.order_id = o.id
      AND p.description = '取消訂單退點修正補發（2026-08-01）'
  );
*/


-- ── 6. 補償動作 B：清掉已取消訂單殘留的通用碼使用記錄 ───────────────────────
--
-- ⚠ 先跑第 4 段確認清單，再取消註解執行。

/*
DELETE FROM coupon_usages cu
USING orders o
WHERE o.id = cu.order_id
  AND o.order_status = 'cancelled';
*/


-- ── 7. 補發後複查：第 1 段應該回傳 0 列 ─────────────────────────────────────
--
-- 另外確認沒有重複補發（每張訂單最多一筆補發記錄）：

SELECT order_id, COUNT(*) AS 補發筆數
FROM point_transactions
WHERE description = '取消訂單退點修正補發（2026-08-01）'
GROUP BY order_id
HAVING COUNT(*) > 1;
