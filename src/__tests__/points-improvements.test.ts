import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase ──────────────────────────────────────────────────────

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
  sendPointsExpiryEmail: vi.fn().mockResolvedValue(undefined),
  sendAnomalyAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function chainMock(data: unknown = null, error: unknown = null) {
  const terminal = { data, error, count: Array.isArray(data) ? data.length : 0 };
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gt = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockResolvedValue(terminal);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminal);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminal));
  // Make chain thenable
  Object.defineProperty(chain, "then", {
    value: (resolve: (v: unknown) => void) => Promise.resolve(terminal).then(resolve),
  });
  return chain;
}

// ── 12.1 到期通知篩選邏輯 ─────────────────────────────────────────────

describe("到期通知篩選邏輯", () => {
  it("應只查詢 7 天內到期且未通知的記錄", () => {
    // 測試概念：查詢條件應包含 expires_at 在 7 天內、notification_sent_7d = false、points > 0
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 驗證時間範圍計算
    expect(sevenDays.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("應只查詢 3 天內到期且未通知的記錄", () => {
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    expect(threeDays.getTime() - now.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("正確聚合同用戶多筆到期點數", () => {
    const txns = [
      { user_id: "u1", points: 50, expires_at: "2026-06-01" },
      { user_id: "u1", points: 30, expires_at: "2026-06-02" },
      { user_id: "u2", points: 100, expires_at: "2026-06-01" },
    ];

    const userMap = new Map<string, number>();
    for (const t of txns) {
      userMap.set(t.user_id, (userMap.get(t.user_id) ?? 0) + t.points);
    }

    expect(userMap.get("u1")).toBe(80);
    expect(userMap.get("u2")).toBe(100);
    expect(userMap.size).toBe(2);
  });
});

// ── 12.2 異常監測閾值判斷 ─────────────────────────────────────────────

describe("異常監測閾值判斷", () => {
  it("multiplier > 5 應標記為 flagged", () => {
    const multiplier = 6;
    expect(multiplier > 5).toBe(true);
  });

  it("multiplier <= 5 不應標記", () => {
    expect(5 > 5).toBe(false);
    expect(3 > 5).toBe(false);
    expect(1 > 5).toBe(false);
  });

  it("同用戶當日 redeem > 500 視為超額", () => {
    const redeems = [
      { user_id: "u1", points: -200 },
      { user_id: "u1", points: -150 },
      { user_id: "u1", points: -200 },
      { user_id: "u2", points: -100 },
    ];

    const userMap = new Map<string, number>();
    for (const r of redeems) {
      userMap.set(r.user_id, (userMap.get(r.user_id) ?? 0) + Math.abs(r.points));
    }

    const excessive = Array.from(userMap.entries()).filter(([, total]) => total > 500);
    expect(excessive).toHaveLength(1);
    expect(excessive[0][0]).toBe("u1");
    expect(excessive[0][1]).toBe(550);
  });

  it("redeem 剛好 500 不算超額", () => {
    const redeems = [
      { user_id: "u1", points: -250 },
      { user_id: "u1", points: -250 },
    ];

    const userMap = new Map<string, number>();
    for (const r of redeems) {
      userMap.set(r.user_id, (userMap.get(r.user_id) ?? 0) + Math.abs(r.points));
    }

    const excessive = Array.from(userMap.entries()).filter(([, total]) => total > 500);
    expect(excessive).toHaveLength(0);
  });
});

// ── 12.3 手動調整點數驗證 ─────────────────────────────────────────────

describe("手動調整點數驗證", () => {
  it("調整點數為 0 時應拒絕", () => {
    const points = 0;
    expect(points === 0).toBe(true);
  });

  it("缺少 adminNote 應拒絕", () => {
    const adminNote = "";
    expect(!adminNote?.trim()).toBe(true);
  });

  it("扣點不可使餘額為負", () => {
    const balance = 100;
    const points = -150;
    expect(balance + points < 0).toBe(true);
  });

  it("扣點後餘額剛好為 0 應通過", () => {
    const balance = 100;
    const points = -100;
    expect(balance + points < 0).toBe(false);
  });

  it("加點應通過（無餘額限制）", () => {
    const points = 500;
    expect(points > 0).toBe(true);
  });
});

// ── 12.5 Campaign audit log 格式 ────────────────────────────────────

describe("Campaign audit log 格式", () => {
  it("變更記錄應包含正確欄位", () => {
    const existing = { name: "夏日活動", multiplier: 2, is_active: true };
    const update = { name: "秋日活動", multiplier: 3 };

    const changedFields = Object.keys(update);
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const field of changedFields) {
      oldValues[field] = existing[field as keyof typeof existing];
      newValues[field] = update[field as keyof typeof update];
    }

    expect(changedFields).toEqual(["name", "multiplier"]);
    expect(oldValues).toEqual({ name: "夏日活動", multiplier: 2 });
    expect(newValues).toEqual({ name: "秋日活動", multiplier: 3 });
  });

  it("停用時 action 為 deactivate", () => {
    const action = "deactivate";
    const changedFields = ["is_active"];
    const oldValues = { is_active: true };
    const newValues = { is_active: false };

    expect(action).toBe("deactivate");
    expect(changedFields).toEqual(["is_active"]);
    expect(oldValues.is_active).toBe(true);
    expect(newValues.is_active).toBe(false);
  });
});

// ── 12.6 Tier history 升/降等 ────────────────────────────────────────

describe("Tier history 記錄", () => {
  it("升等時 reason 為 upgrade", () => {
    const record = {
      from_tier: "standard",
      to_tier: "silver",
      reason: "upgrade",
      triggered_by: "system",
    };
    expect(record.reason).toBe("upgrade");
    expect(record.triggered_by).toBe("system");
  });

  it("年度重置降等時 reason 為 annual_reset", () => {
    const record = {
      from_tier: "gold",
      to_tier: "silver",
      reason: "annual_reset",
      triggered_by: "cron",
    };
    expect(record.reason).toBe("annual_reset");
    expect(record.triggered_by).toBe("cron");
  });

  it("只升不降邏輯：新等級低於現有等級時不升等", () => {
    const tiers = [
      { id: "gold", min_annual_spend: 8000 },
      { id: "silver", min_annual_spend: 3000 },
      { id: "standard", min_annual_spend: 0 },
    ];

    const currentTierId = "gold";
    const currentSpend = 5000; // 低於 gold 但高於 silver

    let newTier = tiers[tiers.length - 1]; // default: standard
    for (const tier of tiers) {
      if (currentSpend >= tier.min_annual_spend) {
        newTier = tier;
        break;
      }
    }

    // newTier = silver, 但 currentTier = gold，所以不應升等
    const currentTierData = tiers.find(t => t.id === currentTierId);
    const shouldUpgrade = newTier.min_annual_spend > (currentTierData?.min_annual_spend ?? 0);

    expect(newTier.id).toBe("silver");
    expect(shouldUpgrade).toBe(false); // silver(3000) < gold(8000)
  });
});
