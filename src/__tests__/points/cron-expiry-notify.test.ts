import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock, createCronRequest } from "./helpers/supabase-mock";

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
