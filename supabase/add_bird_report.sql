-- ============================================================
-- 今日鳥況回報（bird-report）
--
-- 整檔貼上跑。可重複執行（冪等），重跑不會有變化也不會報錯。
--
-- ── 這是什麼 ────────────────────────────────────────────────
-- 業主每天在後台打一行字（例如「8/30 下午 4 點，溪谷方向一大群，約半小時」），
-- 攻略頁與體驗頁就會顯示那一則加上回報時間。
--
-- 客人最怕的不是花錢，是開一小時山路上來卻沒看到鳥。這一行字是唯一
-- 能消掉那個顧慮的東西，而且只有住在賞鳥起點的人給得出來。
--
-- ── 兩個刻意的設計 ──────────────────────────────────────────
-- 1. **append-only**：每次送出 INSERT 一列，不 UPDATE。保留歷史，
--    而且「送錯了」只要補送一則就蓋過去，不需要做編輯或刪除功能——
--    刪除在對外事實上是更危險的操作。
--
-- 2. **沒有 is_active／expires_at 欄位**：48 小時過期是**讀取時**判斷的，
--    不靠排程也不靠欄位。排程壞掉的方式正好最糟：過期的「鳥況良好」
--    繼續掛在線上。少一個會不同步的狀態就少一個失效模式。
--
-- 季節閘門同理不在這裡——它讀 experience_availability_windows，
-- 日期只能有一個真相來源。
--
-- ── RLS ────────────────────────────────────────────────────
-- 只開 SELECT 給 anon（對外頁面要讀）。寫入一律走後台 API，
-- 那邊用 service_role key 並經過 withAdminAuth。
-- **不要**為了方便加 anon 的 INSERT 政策——那等於讓任何人改寫店家對外的事實宣稱。
-- ============================================================

CREATE TABLE IF NOT EXISTS bird_reports (
  id          BIGSERIAL PRIMARY KEY,
  -- 業主打的那一行字。長度上限只是防呆，正常內容遠短於此
  note        TEXT        NOT NULL CHECK (btrim(note) <> '' AND length(note) <= 500),
  -- 過期完全依賴這個時間戳，所以由 DB 填，不接受前端傳入
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 之後多人管理時可以看是誰回報的；目前只有業主一人，選填
  created_by  TEXT
);

-- 對外查詢永遠是「最新一則」，這個索引讓它不必掃全表
CREATE INDEX IF NOT EXISTS bird_reports_reported_at_idx
  ON bird_reports (reported_at DESC);

ALTER TABLE bird_reports ENABLE ROW LEVEL SECURITY;

-- 只讀。DROP 再 CREATE 是為了可重複執行（Postgres 沒有 CREATE POLICY IF NOT EXISTS）
DROP POLICY IF EXISTS bird_reports_public_read ON bird_reports;
CREATE POLICY bird_reports_public_read
  ON bird_reports FOR SELECT
  USING (true);

-- ── 驗收 ────────────────────────────────────────────────────
-- 跑完之後可以用這段確認（應該回傳 0 列，因為還沒有任何回報）：
--   SELECT id, note, reported_at FROM bird_reports ORDER BY reported_at DESC LIMIT 1;
--
-- 接著到後台 /admin/bird-report 送出第一則，再跑一次應該看得到。
