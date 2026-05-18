import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: null } }) } },
  },
}));

vi.mock("@/lib/email", () => ({
  sendTierUpgradeEmail: vi.fn().mockResolvedValue(undefined),
  sendPointsExpiryEmail: vi.fn(),
  sendAnomalyAlertEmail: vi.fn(),
}));

import {
  issuePoints,
  deductPoints,
  refundPoints,
  calculateEarning,
  getValidBalance,
} from "@/lib/points";

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ data: { new_spend: 100, current_tier_id: "standard" }, error: null });
});

// ── Helper: chain mock ──────────────────────────────────────────────────

function chain(data: unknown = null, error: unknown = null) {
  const result = { data, error, count: 0 };
  const c: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "eq", "neq", "gt", "lt", "gte", "lte", "is", "in", "or", "order", "limit"];
  for (const m of methods) c[m] = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue(result);
  (c as Record<string, unknown>).then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return c;
}

// ── Tier/campaign mock setup ────────────────────────────────────────────

function setupIssuePointsMocks(opts: { multiplier?: number; campaigns?: unknown[] } = {}) {
  const { multiplier = 1, campaigns = [] } = opts;
  let callCount = 0;

  mockFrom.mockImplementation((table: string) => {
    if (table === "user_membership") {
      return chain({ tier_id: "standard", member_tiers: { id: "standard", name: "一般會員", min_annual_spend: 0, points_rate: 0.02, max_discount_rate: 0.10 } }, null);
    }
    if (table === "points_campaigns") {
      return chain(campaigns, null);
    }
    if (table === "point_transactions") {
      callCount++;
      if (callCount === 1) {
        // count query for first_purchase check
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 1 }) }) }) };
      }
      // insert call
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      return { insert: insertMock, _insertMock: insertMock };
    }
    if (table === "member_tiers") {
      return chain([
        { id: "gold", min_annual_spend: 8000 },
        { id: "silver", min_annual_spend: 3000 },
        { id: "standard", min_annual_spend: 0 },
      ], null);
    }
    if (table === "profiles") return chain({ name: "test" }, null);
    return chain(null, null);
  });
}

// ── 8.2-8.3: issuePoints flagging ──────────────────────────────────────

describe("issuePoints flagging", () => {
  it("multiplier > 5 → is_flagged = true", async () => {
    const insertCalls: unknown[] = [];
    let txnCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        return chain({ tier_id: "standard", member_tiers: { id: "standard", name: "一般會員", min_annual_spend: 0, points_rate: 0.02, max_discount_rate: 0.10 } }, null);
      }
      if (table === "points_campaigns") {
        return chain([{ id: "c1", campaign_type: "global", multiplier: 6, is_active: true, starts_at: "2020-01-01", ends_at: "2099-12-31" }], null);
      }
      if (table === "point_transactions") {
        txnCallCount++;
        const insertMock = vi.fn().mockImplementation((data: unknown) => { insertCalls.push(data); return Promise.resolve({ error: null }); });
        return { insert: insertMock, select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 1 }) }) }) };
      }
      if (table === "member_tiers") return chain([{ id: "standard", min_annual_spend: 0 }], null);
      return chain(null, null);
    });

    await issuePoints({ userId: "u1", earnBase: 1000 });
    const insertData = insertCalls.find((c: unknown) => (c as Record<string, unknown>).type === "earn") as Record<string, unknown> | undefined;
    expect(insertData?.is_flagged).toBe(true);
  });

  it("multiplier <= 5 → is_flagged = false", async () => {
    const insertCalls: unknown[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        return chain({ tier_id: "standard", member_tiers: { id: "standard", name: "一般會員", min_annual_spend: 0, points_rate: 0.02, max_discount_rate: 0.10 } }, null);
      }
      if (table === "points_campaigns") {
        return chain([{ id: "c1", campaign_type: "global", multiplier: 3, is_active: true, starts_at: "2020-01-01", ends_at: "2099-12-31" }], null);
      }
      if (table === "point_transactions") {
        const insertMock = vi.fn().mockImplementation((data: unknown) => { insertCalls.push(data); return Promise.resolve({ error: null }); });
        return { insert: insertMock, select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 1 }) }) }) };
      }
      if (table === "member_tiers") return chain([{ id: "standard", min_annual_spend: 0 }], null);
      return chain(null, null);
    });

    await issuePoints({ userId: "u1", earnBase: 1000 });
    const insertData = insertCalls.find((c: unknown) => (c as Record<string, unknown>).type === "earn") as Record<string, unknown> | undefined;
    expect(insertData?.is_flagged).toBe(false);
  });
});

// ── 8.4-8.5: deductPoints ──────────────────────────────────────────────

describe("deductPoints", () => {
  it("points = 0 不寫入", async () => {
    await deductPoints({ userId: "u1", points: 0 });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("正常扣點 → 負值 + type=redeem", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await deductPoints({ userId: "u1", points: 50 });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      points: -50,
      type: "redeem",
    }));
  });
});

// ── 8.6-8.7: refundPoints ──────────────────────────────────────────────

describe("refundPoints", () => {
  it("points = 0 不寫入", async () => {
    await refundPoints({ userId: "u1", points: 0 });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("正常退還 → 正值 + type=refund", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertMock });

    await refundPoints({ userId: "u1", points: 30 });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      points: 30,
      type: "refund",
    }));
  });
});

// ── 8.8-8.11: calculateEarning ─────────────────────────────────────────

describe("calculateEarning", () => {
  it("無活動 → 倍率 1x", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        return chain({ tier_id: "standard", member_tiers: { id: "standard", name: "一般會員", min_annual_spend: 0, points_rate: 0.02, max_discount_rate: 0.10 } }, null);
      }
      if (table === "points_campaigns") return chain([], null);
      return chain(null, null);
    });

    const earned = await calculateEarning("u1", 1000);
    expect(earned).toBe(20); // 1000 * 0.02 * 1
  });

  it("多個 global → 取最高", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        return chain({ tier_id: "standard", member_tiers: { id: "standard", name: "一般會員", min_annual_spend: 0, points_rate: 0.02, max_discount_rate: 0.10 } }, null);
      }
      if (table === "points_campaigns") return chain([
        { campaign_type: "global", multiplier: 2, is_active: true, starts_at: "2020-01-01", ends_at: "2099-12-31" },
        { campaign_type: "global", multiplier: 3, is_active: true, starts_at: "2020-01-01", ends_at: "2099-12-31" },
      ], null);
      return chain(null, null);
    });

    const earned = await calculateEarning("u1", 1000);
    expect(earned).toBe(60); // 1000 * 0.02 * 3
  });

  it("first_purchase 對首購生效", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        return chain({ tier_id: "standard", member_tiers: { id: "standard", name: "一般會員", min_annual_spend: 0, points_rate: 0.02, max_discount_rate: 0.10 } }, null);
      }
      if (table === "points_campaigns") return chain([
        { campaign_type: "first_purchase", multiplier: 5, is_active: true, starts_at: "2020-01-01", ends_at: "2099-12-31" },
      ], null);
      if (table === "point_transactions") {
        // count = 0 → first purchase
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0 }) }) }) };
      }
      return chain(null, null);
    });

    const earned = await calculateEarning("u1", 1000);
    expect(earned).toBe(100); // 1000 * 0.02 * 5
  });

  it("first_purchase 對非首購不生效", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_membership") {
        return chain({ tier_id: "standard", member_tiers: { id: "standard", name: "一般會員", min_annual_spend: 0, points_rate: 0.02, max_discount_rate: 0.10 } }, null);
      }
      if (table === "points_campaigns") return chain([
        { campaign_type: "first_purchase", multiplier: 5, is_active: true, starts_at: "2020-01-01", ends_at: "2099-12-31" },
      ], null);
      if (table === "point_transactions") {
        // count = 3 → not first purchase
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 3 }) }) }) };
      }
      return chain(null, null);
    });

    const earned = await calculateEarning("u1", 1000);
    expect(earned).toBe(20); // 1000 * 0.02 * 1 (fallback)
  });
});

// ── 8.12-8.14: getValidBalance ─────────────────────────────────────────

describe("getValidBalance", () => {
  function setupBalanceMock(positiveData: unknown[], negativeData: unknown[]) {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const data = callCount % 2 === 1 ? positiveData : negativeData;
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ data, error: null }),
            }),
            lt: vi.fn().mockResolvedValue({ data, error: null }),
          }),
        }),
      };
    });
  }

  it("正值+負值=正確餘額", async () => {
    setupBalanceMock([{ points: 100 }, { points: 50 }], [{ points: -30 }]);
    const balance = await getValidBalance("u1");
    expect(balance).toBe(120); // 150 - 30
  });

  it("全過期=0", async () => {
    setupBalanceMock([], [{ points: -30 }]);
    const balance = await getValidBalance("u1");
    expect(balance).toBe(0); // max(0 + (-30), 0) = 0
  });

  it("無交易=0", async () => {
    setupBalanceMock([], []);
    const balance = await getValidBalance("u1");
    expect(balance).toBe(0);
  });
});
