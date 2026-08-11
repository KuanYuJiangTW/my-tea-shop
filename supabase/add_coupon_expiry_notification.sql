-- ─────────────────────────────────────────────────────────────────────────
-- 折價券到期通知：標記欄位 + 查詢索引
--
-- ⚠️ /api/cron/coupon-expiry-notify 依賴這個欄位。**這支 SQL 必須先在
--    Supabase 執行完畢，該 cron 才能上線**，否則每次執行都會查詢失敗。
--
-- 命名沿用 point_transactions 的 notification_sent_7d，保持兩套到期通知一致。
-- ─────────────────────────────────────────────────────────────────────────

alter table public.coupons
  add column if not exists notification_sent_7d boolean not null default false;

-- 部分索引：cron 每天只找「未使用、未通知、即將到期」的券。
-- 已使用或已通知的列不進索引，隨券量成長仍維持小體積。
create index if not exists idx_coupons_expiry_notify
  on public.coupons (expires_at)
  where used_at is null and notification_sent_7d = false;

-- 驗證用：
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where table_name = 'coupons' and column_name = 'notification_sent_7d';
