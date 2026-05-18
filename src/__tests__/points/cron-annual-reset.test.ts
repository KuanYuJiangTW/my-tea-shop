import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock, createCronRequest } from "./helpers/supabase-mock";

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@/lib/email", () => ({
  sendTierUpgradeEmail: vi.fn(),
  sendPointsExpiryEmail: vi.fn(),
  sendAnomalyAlertEmail: vi.fn(),
}));

import { GET } from "@/app/api/cron/reset-annual-spend/route";

const CRON_SECRET = "test-secret";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
});

describe("reset-annual-spend cron", () => {
  // 4.2
  it("無授權 → 401", async () => {
    const res = await GET(createCronRequest());
    expect(res.status).toBe(401);
  });

  // 4.3
  it("RPC 成功路徑 → mode: rpc + tier_history 寫入", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { user_id: "u1", old_tier: "gold", new_tier: "silver", old_spend: 2000 },
      ],
      error: null,
    });

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "tier_history") return { insert: insertMock };
      return createChainMock(null, null);
    });

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.mode).toBe("rpc");
    expect(json.downgrades).toBe(1);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "u1",
      from_tier: "gold",
      to_tier: "silver",
      reason: "annual_reset",
      triggered_by: "cron",
    }));
  });

  // 4.4
  it("RPC 失敗 fallback → 逐筆處理", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC not found" } });

    const tiers = [
      { id: "gold", min_annual_spend: 8000 },
      { id: "silver", min_annual_spend: 3000 },
      { id: "standard", min_annual_spend: 0 },
    ];

    const memberships = [
      { user_id: "u1", tier_id: "gold", annual_spend: 2000 }, // should downgrade to standard
    ];

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    let fromCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        fromCallCount++;
        if (fromCallCount === 1) return createChainMock(memberships, null); // select
        return createChainMock(null, null); // update
      }
      if (table === "member_tiers") return createChainMock(tiers, null);
      if (table === "tier_history") return { insert: insertMock };
      return createChainMock(null, null);
    });

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.mode).toBe("fallback");
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      from_tier: "gold",
      reason: "annual_reset",
    }));
  });

  // 4.5
  it("降等正確判斷（spend < 門檻）", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "no rpc" } });

    const tiers = [
      { id: "gold", min_annual_spend: 8000 },
      { id: "silver", min_annual_spend: 3000 },
      { id: "standard", min_annual_spend: 0 },
    ];
    const memberships = [
      { user_id: "u1", tier_id: "silver", annual_spend: 1000 }, // below silver → standard
    ];

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    let fromCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        fromCallCount++;
        if (fromCallCount === 1) return createChainMock(memberships, null);
        return createChainMock(null, null);
      }
      if (table === "member_tiers") return createChainMock(tiers, null);
      if (table === "tier_history") return { insert: insertMock };
      return createChainMock(null, null);
    });

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.results.downgraded).toBe(1);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      from_tier: "silver",
      to_tier: "standard",
    }));
  });

  // 4.6
  it("未降等不寫 tier_history", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "no rpc" } });

    const tiers = [
      { id: "gold", min_annual_spend: 8000 },
      { id: "silver", min_annual_spend: 3000 },
      { id: "standard", min_annual_spend: 0 },
    ];
    const memberships = [
      { user_id: "u1", tier_id: "silver", annual_spend: 5000 }, // 5000 >= 3000 → keep silver
    ];

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    let fromCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        fromCallCount++;
        if (fromCallCount === 1) return createChainMock(memberships, null);
        return createChainMock(null, null);
      }
      if (table === "member_tiers") return createChainMock(tiers, null);
      if (table === "tier_history") return { insert: insertMock };
      return createChainMock(null, null);
    });

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.results.maintained).toBe(1);
    expect(json.results.downgraded).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
