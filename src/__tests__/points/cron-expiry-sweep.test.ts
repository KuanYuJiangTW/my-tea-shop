import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock, createCronRequest } from "./helpers/supabase-mock";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/email", () => ({
  sendPointsExpiryEmail: vi.fn(),
  sendTierUpgradeEmail: vi.fn(),
  sendAnomalyAlertEmail: vi.fn(),
}));

import { GET } from "@/app/api/cron/points-expiry-sweep/route";

const CRON_SECRET = "test-secret";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
});

describe("points-expiry-sweep cron", () => {
  // 2.2
  it("無授權 → 401", async () => {
    const res = await GET(createCronRequest());
    expect(res.status).toBe(401);
  });

  // 2.3
  it("無過期點數 → swept: 0", async () => {
    mockFrom.mockReturnValue(createChainMock([], null));
    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.swept).toBe(0);
  });

  // 2.4
  it("掃描過期點數 → 寫入 events + 標記 swept_at", async () => {
    let callCount = 0;
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue(createChainMock(null, null));

    mockFrom.mockImplementation((table: string) => {
      if (table === "point_transactions") {
        callCount++;
        if (callCount === 1) {
          // 查詢過期的交易
          return createChainMock([
            { id: "t1", user_id: "u1", points: 50, expires_at: "2025-01-01" },
            { id: "t2", user_id: "u1", points: 30, expires_at: "2025-01-02" },
            { id: "t3", user_id: "u2", points: 100, expires_at: "2025-01-01" },
          ], null);
        }
        // update call
        return { update: updateMock };
      }
      if (table === "points_expiry_events") {
        return { insert: insertMock };
      }
      return createChainMock(null, null);
    });

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.swept).toBe(3);
    expect(json.users).toBe(2);
    expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ user_id: "u1", points_expired: 80 }),
      expect.objectContaining({ user_id: "u2", points_expired: 100 }),
    ]));
  });

  // 2.5
  it("DB 查詢錯誤 → 500", async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: "DB error" }));
    const res = await GET(createCronRequest(CRON_SECRET));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB error");
  });
});
