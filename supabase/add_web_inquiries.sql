-- ============================================================
-- web_inquiries — 「風土數位」報價頁（/web-design）諮詢表單落庫
-- ============================================================
-- 用途：/web-design 頁面的六題諮詢表單，經 POST /api/web-inquiry
--       以 service_role client 寫入。匿名訪客提交，不綁 auth.uid()。
--
-- RLS：啟用但刻意「不建立任何 anon/authenticated policy」（deny by default）。
--       全站查無匿名 insert policy 先例，讀寫一律經 API route 的
--       service_role client（bypass RLS）。詳見
--       openspec/changes/add-web-design-quote-page/design.md Decision 1。
--
-- 執行方式：本專案無 CLI migration 流程，由業主在 Supabase SQL editor
--       貼上本檔全文執行一次即可。
-- ============================================================

CREATE TABLE IF NOT EXISTS web_inquiries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_source  text        NOT NULL,              -- 認識管道（單選白名單，見 API route）
  industry_brand   text        NOT NULL,               -- 產業與品牌名稱
  pain_points      text[]      NOT NULL DEFAULT '{}',  -- 想解決的痛點（複選白名單）
  budget_range     text        NOT NULL,               -- 預算區間（單選白名單）
  timeline         text        NOT NULL,               -- 期望上線時程（單選白名單）
  contact_name     text        NOT NULL,               -- 聯絡人姓名（必填）
  contact_line     text,                                -- LINE ID（與 email 至少一項）
  contact_email    text,                                -- Email（與 line 至少一項）
  contact_time     text,                                -- 方便聯絡的時段（選填）
  locale           text        NOT NULL DEFAULT 'zh',  -- 提交時的語系（zh／en）
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_inquiries_created_at
  ON web_inquiries(created_at DESC);

-- RLS：deny by default，不建任何 policy
ALTER TABLE web_inquiries ENABLE ROW LEVEL SECURITY;
