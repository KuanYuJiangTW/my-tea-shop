import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 鳥況回報的 route 與 SQL 的靜態不變量。
 *
 * 授權本身由 `route-auth-coverage.test.ts` 統一掃描（所有 /api/admin/** 都要包
 * withAdminAuth），這裡不重複；補的是那支掃不到的三件事：
 *
 * 1. **RLS 不得開放匿名寫入**。鳥況是店家對客人的事實宣稱，任何人能改寫它
 *    就等於任何人能叫客人白跑一趟。本站已有過「orders 開了危險寫入政策」的
 *    稽核紀錄，新表不該重蹈。
 * 2. **reported_at 由 DB 填**。48 小時過期完全依賴這個時間戳，能被前端傳入
 *    就等於能被繞過。
 * 3. **資料表不存在時後台要明說要跑哪支 SQL**。本 repo 的 SQL 由業主手動執行，
 *    「壞掉了但不知道要做什麼」是最容易卡住的狀態。
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * 剝掉 `--` 註解再斷言。這個檔的註解裡本來就會出現「沒有 is_active」
 * 「Postgres 沒有 CREATE POLICY IF NOT EXISTS」這類字樣——對整份檔案做字串比對
 * 會抓到說明文字而不是真正的 SQL，第一版就是這樣假性失敗的。
 */
const sql = () =>
  read("supabase/add_bird_report.sql")
    .split("\n")
    .filter(line => !line.trim().startsWith("--"))
    .join("\n");

const route = () => read("src/app/api/admin/bird-report/route.ts");

describe("add_bird_report.sql — 安全性", () => {
  it("有開 RLS", () => {
    expect(sql()).toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("只給 SELECT 政策，沒有任何寫入政策——寫入一律走後台 API", () => {
    const policies = sql().match(/CREATE POLICY[\s\S]*?;/g) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) {
      expect(p).toContain("FOR SELECT");
      expect(p).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/);
    }
  });

  it("沒有 WITH CHECK——那是寫入政策才需要的東西，出現就代表開了寫入", () => {
    expect(sql()).not.toContain("WITH CHECK");
  });
});

describe("add_bird_report.sql — 可重複執行", () => {
  it("建表與索引都是 IF NOT EXISTS", () => {
    expect(sql()).toContain("CREATE TABLE IF NOT EXISTS bird_reports");
    expect(sql()).toContain("CREATE INDEX IF NOT EXISTS");
  });

  it("政策先 DROP IF EXISTS 再建——Postgres 沒有 CREATE POLICY IF NOT EXISTS", () => {
    expect(sql()).toContain("DROP POLICY IF EXISTS");
  });
});

describe("add_bird_report.sql — 過期機制的前提", () => {
  it("reported_at 有 DEFAULT now()，不必也不該由呼叫端傳入", () => {
    expect(sql()).toMatch(/reported_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT now\(\)/);
  });

  it("note 有非空的 CHECK——空白回報等於沒有回報，不該進得了資料庫", () => {
    expect(sql()).toContain("btrim(note) <> ''");
  });

  it("沒有 is_active／expires_at 這類會與真實時間不同步的欄位", () => {
    expect(sql()).not.toMatch(/\bis_active\b/);
    expect(sql()).not.toMatch(/\bexpires_at\b/);
  });
});

describe("後台 route", () => {
  it("寫入時不傳 reported_at，交給 DB 的 default", () => {
    expect(read("src/lib/bird-report.ts")).not.toMatch(/insert\([^)]*reported_at/);
  });

  it("空白內容回 400", () => {
    expect(route()).toContain("status: 400");
  });

  it("資料表不存在時回 503，並指名要跑哪一支 SQL", () => {
    expect(route()).toContain("status: 503");
    expect(route()).toContain("supabase/add_bird_report.sql");
  });

  it("GET 會回報目前的顯示狀態——業主打開頁面的第一個問題就是這個", () => {
    expect(route()).toContain("offSeason");
    expect(route()).toContain("expired");
    expect(route()).toContain("showing");
  });
});

describe("對外顯示", () => {
  it("資料表不存在時對外靜默略過，不把 notMigrated 洩漏到頁面上", () => {
    const c = read("src/components/BirdReport.tsx");
    expect(c).toContain("if (!visible) return null;");
    expect(c).not.toContain("notMigrated");
  });

  it("時間一定跟著顯示——「鳥況良好」是宣稱，帶時間才是回報", () => {
    expect(read("src/components/BirdReport.tsx")).toContain("Intl.DateTimeFormat");
  });
});
