-- ─────────────────────────────────────────────────────────────────────────────
-- 後台 session 管理 — 取代固定 HMAC token，改為隨機 token 存 DB（可撤銷、會過期）
-- 僅由後端 service_role 寫入/刪除；驗證由 security definer RPC 提供給匿名客端（middleware）
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.admin_sessions (
  token      text         primary key,
  created_at timestamptz  not null default now(),
  expires_at timestamptz  not null,
  ip         text
);

alter table public.admin_sessions enable row level security;
-- 不建立任何 policy：只有 service_role（繞過 RLS）能讀寫

-- 方便依過期時間清理舊 session，並加速驗證查詢
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions (expires_at);

-- ── validate_admin_session：查詢 token 是否存在且未過期 ──────────────────────────
-- security definer：以建立者權限執行，使匿名客端（Edge middleware）也能驗證，
-- 而不需將 service_role key 帶進 Edge Runtime。回傳 true = 有效 session。
create or replace function public.validate_admin_session(p_token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_sessions
    where token = p_token
      and expires_at > now()
  );
$$;

-- 允許匿名與已登入角色呼叫此驗證函式（函式內部僅回傳布林，不洩漏資料）
grant execute on function public.validate_admin_session(text) to anon, authenticated;
