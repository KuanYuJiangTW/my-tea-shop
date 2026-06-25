-- ─────────────────────────────────────────────────────────────────────────────
-- 持久化限流（rate limiting）— 取代記憶體內限流，解決 Vercel serverless 多 instance 失效問題
-- 僅由後端 service_role 存取（RLS 開啟、不建任何 policy = anon 完全無法存取）
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.rate_limits (
  key      text primary key,
  count    int          not null default 0,
  reset_at timestamptz  not null
);

alter table public.rate_limits enable row level security;
-- 不建立任何 policy：只有 service_role（繞過 RLS）能讀寫

-- 方便清理過期列（可選，由 cron 或手動執行）
create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- ── check_rate_limit：原子性「遞增並判斷」，用於每次請求型限流 ──────────────
-- 回傳 true = 允許，false = 已超過上限。單一 upsert 語句保證併發安全。
create or replace function public.check_rate_limit(
  p_key       text,
  p_max       int,
  p_window_ms bigint
) returns boolean
language plpgsql
as $$
declare
  v_now   timestamptz := now();
  v_count int;
begin
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update
    set count = case
                  when public.rate_limits.reset_at <= v_now then 1
                  else public.rate_limits.count + 1
                end,
        reset_at = case
                  when public.rate_limits.reset_at <= v_now
                    then v_now + make_interval(secs => p_window_ms / 1000.0)
                  else public.rate_limits.reset_at
                end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- ── bump_rate_limit：只遞增、回傳目前計數，用於「只計失敗次數」的場景（後台登入）──
create or replace function public.bump_rate_limit(
  p_key       text,
  p_window_ms bigint
) returns int
language plpgsql
as $$
declare
  v_now   timestamptz := now();
  v_count int;
begin
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update
    set count = case
                  when public.rate_limits.reset_at <= v_now then 1
                  else public.rate_limits.count + 1
                end,
        reset_at = case
                  when public.rate_limits.reset_at <= v_now
                    then v_now + make_interval(secs => p_window_ms / 1000.0)
                  else public.rate_limits.reset_at
                end
  returning count into v_count;

  return v_count;
end;
$$;
