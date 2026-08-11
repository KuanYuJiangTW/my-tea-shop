import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createChainMock,
  createCronRequest,
  createSelectAwareChainMock,
} from "./helpers/supabase-mock";

// ── Mocks ───────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockGetUserById = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { admin: { getUserById: (...args: unknown[]) => mockGetUserById(...args) } },
  },
}));

vi.mock("@/lib/email", () => ({
  sendPointsExpiryEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { GET } from "@/app/api/cron/points-expiry-notify/route";

// ── Helpers ─────────────────────────────────────────────────────────────

const CRON_SECRET = "test-secret";

function setupEnv() {
  process.env.CRON_SECRET = CRON_SECRET;
}

function setupEmptyQuery() {
  // point_transactions query returns empty, profiles/auth won't be called
  mockFrom.mockReturnValue(createChainMock([], null));
}

function setupExpiringData(records: Array<{ id: string; user_id: string; points: number; expires_at: string }>) {
  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === "point_transactions") {
      callCount++;
      // First call = 7d query, third call = 3d query; 2nd/4th calls = update
      if (callCount === 1) return createChainMock(records, null);
      if (callCount === 3) return createChainMock([], null); // 3d empty
      return createChainMock(null, null); // update calls
    }
    if (table === "profiles") {
      return createChainMock({ name: "小江" }, null);
    }
    return createChainMock(null, null);
  });

  mockGetUserById.mockResolvedValue({ data: { user: { email: "test@example.com" } } });
  mockSendEmail.mockResolvedValue(undefined);
}

// ── Tests ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setupEnv();
});

describe("points-expiry-notify cron", () => {
  // 1.2
  it("無授權 header → 401", async () => {
    const req = createCronRequest(); // no secret
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  // 1.3
  it("正確授權但無到期點數 → 200 + 不發 email", async () => {
    setupEmptyQuery();
    const req = createCronRequest(CRON_SECRET);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results.sent7d).toBe(0);
    expect(json.results.sent3d).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // 1.4
  it("7 天內到期 → 發 email + sent7d > 0", async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    setupExpiringData([
      { id: "t1", user_id: "u1", points: 100, expires_at: future },
    ]);

    const req = createCronRequest(CRON_SECRET);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results.sent7d).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: "test@example.com",
      expiringPoints: 100,
    }));
  });

  // 1.5
  it("3 天內到期 → 發 email + sent3d > 0", async () => {
    const future3d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "point_transactions") {
        callCount++;
        if (callCount === 1) return createChainMock([], null); // 7d empty
        if (callCount === 2) return createChainMock([ // 3d has data
          { id: "t2", user_id: "u2", points: 50, expires_at: future3d },
        ], null);
        return createChainMock(null, null); // update
      }
      if (table === "profiles") return createChainMock({ name: "會員" }, null);
      return createChainMock(null, null);
    });
    mockGetUserById.mockResolvedValue({ data: { user: { email: "user2@test.com" } } });
    mockSendEmail.mockResolvedValue(undefined);

    const req = createCronRequest(CRON_SECRET);
    const res = await GET(req);
    const json = await res.json();
    expect(json.results.sent3d).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      customerEmail: "user2@test.com",
      expiringPoints: 50,
    }));
  });

  // ── 標記已通知（用 select-aware mock，忠實反映 Supabase 只回傳 select 欄位）──
  //
  // 這組測試存在的理由：舊實作的 7 天查詢沒有 select `id`，標記段卻用 `t.id`
  // 組主鍵清單，線上 ids 恆為空、update 從未執行，於是同一批人在到期前每天
  // 都收一封信。寬鬆的 createChainMock 會回傳 select 沒要的欄位，完全遮蔽這個 bug。

  const DAY = 24 * 60 * 60 * 1000;
  const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

  /** point_transactions 的每次查詢都用 select-aware mock，並記錄所有 chain */
  function setupSelectAware(rows7d: Record<string, unknown>[], rows3d: Record<string, unknown>[] = []) {
    const ptChains: Record<string, ReturnType<typeof vi.fn>>[] = [];
    let ptCall = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return createChainMock({ name: "小江" }, null);
      if (table === "point_transactions") {
        ptCall++;
        // 呼叫序：1 = 7d 查詢、2 = 7d update、3 = 3d 查詢、4 = 3d update。
        // update 用的 chain 不會走 select，給空資料即可。
        const rows = ptCall === 1 ? rows7d : ptCall === 3 ? rows3d : [];
        const c = createSelectAwareChainMock(rows, null);
        ptChains.push(c);
        return c;
      }
      return createChainMock(null, null);
    });

    mockGetUserById.mockResolvedValue({ data: { user: { email: "test@example.com" } } });
    mockSendEmail.mockResolvedValue(undefined);
    return ptChains;
  }

  it("7 天查詢必須 select id——標記段要靠主鍵才鎖得住列", async () => {
    const chains = setupSelectAware([
      { id: "t1", user_id: "u1", points: 100, expires_at: inDays(5) },
    ]);

    await GET(createCronRequest(CRON_SECRET));

    const cols = (chains[0] as unknown as { _selectedCols: () => string[] })._selectedCols();
    expect(cols).toContain("id");
  });

  it("寄信成功後必須真的標記 notification_sent_7d（否則每天重複寄）", async () => {
    const chains = setupSelectAware([
      { id: "t1", user_id: "u1", points: 100, expires_at: inDays(5) },
    ]);

    await GET(createCronRequest(CRON_SECRET));

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const updated = chains.filter(c => c.update.mock.calls.length > 0);
    expect(updated.length).toBeGreaterThan(0);
    expect(updated[0].update).toHaveBeenCalledWith({ notification_sent_7d: true });
    expect(updated[0].in).toHaveBeenCalledWith("id", ["t1"]);
  });

  it("寄信失敗的點數不得被標記為已通知", async () => {
    const chains = setupSelectAware([
      { id: "t1", user_id: "u1", points: 100, expires_at: inDays(5) },
      { id: "t2", user_id: "u2", points: 200, expires_at: inDays(5) },
    ]);
    mockSendEmail
      .mockRejectedValueOnce(new Error("resend down"))
      .mockResolvedValueOnce(undefined);

    await GET(createCronRequest(CRON_SECRET));

    const updated = chains.filter(c => c.update.mock.calls.length > 0);
    expect(updated.length).toBe(1);
    // 只有 u2 成功，只有 t2 該被標記
    expect(updated[0].in).toHaveBeenCalledWith("id", ["t2"]);
  });

  it("全部寄信失敗時完全不呼叫 update", async () => {
    const chains = setupSelectAware([
      { id: "t1", user_id: "u1", points: 100, expires_at: inDays(5) },
    ]);
    mockSendEmail.mockRejectedValue(new Error("resend down"));

    await GET(createCronRequest(CRON_SECRET));

    expect(chains.some(c => c.update.mock.calls.length > 0)).toBe(false);
  });

  // 兩段都給資料，讓 from("point_transactions") 的呼叫序固定為
  // 查詢→update→查詢→update；只給 3d 資料的話 7d 不會 update，序號會位移。
  // 斷言不看順序，改用 update 的欄位名分辨是哪一段。
  it("3 天段同樣只標記寄送成功的列", async () => {
    const chains = setupSelectAware(
      [{ id: "t1", user_id: "u1", points: 100, expires_at: inDays(2) }],
      [{ id: "t9", user_id: "u9", points: 50, expires_at: inDays(2) }],
    );

    await GET(createCronRequest(CRON_SECRET));

    const updated = chains.filter(c => c.update.mock.calls.length > 0);
    const threeDay = updated.find(
      c => (c.update.mock.calls[0][0] as Record<string, unknown>).notification_sent_3d === true,
    );
    expect(threeDay).toBeDefined();
    expect(threeDay!.in).toHaveBeenCalledWith("id", ["t9"]);
  });

  // 1.6
  it("同用戶多筆到期正確聚合", async () => {
    const future = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
    const future2 = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    setupExpiringData([
      { id: "t1", user_id: "u1", points: 60, expires_at: future },
      { id: "t2", user_id: "u1", points: 40, expires_at: future2 },
    ]);

    const req = createCronRequest(CRON_SECRET);
    const res = await GET(req);
    const json = await res.json();
    expect(json.results.sent7d).toBe(1); // 一位用戶 = 一封 email
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      expiringPoints: 100, // 60 + 40
    }));
  });
});
