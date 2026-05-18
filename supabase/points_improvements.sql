-- ============================================================
-- points-system-improvements: Database Migration
-- ============================================================

-- ─── 1.1 tier_history 表 ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_tier TEXT NOT NULL,
  to_tier TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'upgrade', 'annual_reset', 'manual'
  triggered_by TEXT NOT NULL DEFAULT 'system', -- 'system', 'cron', 'admin'
  admin_id UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_history_user
  ON tier_history (user_id, changed_at DESC);

-- ─── 1.2 campaign_audit_log 表 ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'update', 'deactivate'
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  admin_id UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_audit_log_campaign
  ON campaign_audit_log (campaign_id, changed_at DESC);

-- ─── 1.3 points_expiry_events 表 ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS points_expiry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_expired INTEGER NOT NULL,
  expired_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_expiry_events_user
  ON points_expiry_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_points_expiry_events_month
  ON points_expiry_events (created_at);

-- ─── 1.4 point_transactions 新增欄位 ────────────────────────────────────

-- type 加入 'adjustment'（原有 constraint 需更新）
-- 注意：若有 CHECK constraint 需先 DROP 再重建
DO $$
BEGIN
  -- 新增 admin_id 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'point_transactions' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN admin_id UUID REFERENCES auth.users(id);
  END IF;

  -- 新增 admin_note 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'point_transactions' AND column_name = 'admin_note'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN admin_note TEXT;
  END IF;

  -- 新增 is_flagged 欄位
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'point_transactions' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ─── 1.5 point_transactions 通知標記欄位 ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'point_transactions' AND column_name = 'notification_sent_7d'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN notification_sent_7d BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'point_transactions' AND column_name = 'notification_sent_3d'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN notification_sent_3d BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 新增 swept_at 欄位（過期沖銷標記）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'point_transactions' AND column_name = 'swept_at'
  ) THEN
    ALTER TABLE point_transactions ADD COLUMN swept_at TIMESTAMPTZ;
  END IF;
END $$;

-- 加速到期通知查詢
CREATE INDEX IF NOT EXISTS idx_point_transactions_expiry_notify
  ON point_transactions (expires_at, notification_sent_7d, notification_sent_3d)
  WHERE points > 0 AND expires_at IS NOT NULL;

-- 加速過期沖銷掃描
CREATE INDEX IF NOT EXISTS idx_point_transactions_expiry_sweep
  ON point_transactions (expires_at, swept_at)
  WHERE points > 0 AND swept_at IS NULL;

-- ─── 10. 年度重置批次 RPC ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION batch_annual_reset()
RETURNS TABLE(user_id UUID, old_tier TEXT, new_tier TEXT, old_spend NUMERIC) AS $$
DECLARE
  r RECORD;
  v_new_tier TEXT;
BEGIN
  -- 逐筆判斷降等，但用一次 UPDATE 重置 annual_spend
  FOR r IN
    SELECT um.user_id, um.tier_id, um.annual_spend,
           mt.min_annual_spend AS current_min
    FROM user_membership um
    LEFT JOIN member_tiers mt ON mt.id = um.tier_id
  LOOP
    -- 找到對應新等級
    SELECT id INTO v_new_tier
    FROM member_tiers
    WHERE min_annual_spend <= r.annual_spend
    ORDER BY min_annual_spend DESC
    LIMIT 1;

    IF v_new_tier IS NULL THEN
      v_new_tier := 'standard';
    END IF;

    -- 回傳需降等的記錄
    IF v_new_tier != r.tier_id THEN
      user_id := r.user_id;
      old_tier := r.tier_id;
      new_tier := v_new_tier;
      old_spend := r.annual_spend;
      RETURN NEXT;

      UPDATE user_membership
      SET tier_id = v_new_tier,
          annual_spend = 0,
          annual_reset_at = NOW(),
          updated_at = NOW()
      WHERE user_membership.user_id = r.user_id;
    ELSE
      UPDATE user_membership
      SET annual_spend = 0,
          annual_reset_at = NOW(),
          updated_at = NOW()
      WHERE user_membership.user_id = r.user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
