-- ============================================================
-- RPC: increment_annual_spend
-- Atomic increment 避免併發 race condition
-- ============================================================

CREATE OR REPLACE FUNCTION increment_annual_spend(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_spend INTEGER;
  v_tier_id TEXT;
BEGIN
  -- Upsert with atomic increment
  INSERT INTO user_membership (user_id, tier_id, annual_spend, updated_at)
  VALUES (p_user_id, 'standard', p_amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    annual_spend = user_membership.annual_spend + p_amount,
    updated_at = NOW()
  RETURNING annual_spend, tier_id INTO v_new_spend, v_tier_id;

  RETURN json_build_object(
    'new_spend', v_new_spend,
    'current_tier_id', v_tier_id
  );
END;
$$;

-- ============================================================
-- Index: 加速 getValidBalance 查詢
-- ============================================================

-- 加速「未過期正向點數」查詢
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_positive
  ON point_transactions (user_id, points)
  WHERE points > 0;

-- 加速「負向點數」查詢
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_negative
  ON point_transactions (user_id, points)
  WHERE points < 0;

-- 加速過期判斷
CREATE INDEX IF NOT EXISTS idx_point_transactions_expires
  ON point_transactions (user_id, expires_at)
  WHERE expires_at IS NOT NULL AND points > 0;
