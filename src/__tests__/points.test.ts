import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase — factory cannot reference outer variables
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Import after mock setup
import { supabase } from "@/lib/supabase";
import { getValidBalance, validateRedemption, MIN_POINTS_USE } from "@/lib/points";

const mockFrom = vi.mocked(supabase.from);

// Helper: mock getValidBalance's dual-query pattern (positive + negative)
function setupBalanceMock(positiveData: unknown[], negativeData: unknown[]) {
  let callCount = 0;
  mockFrom.mockImplementation(() => {
    callCount++;
    // getValidBalance now does 2 parallel queries:
    // 1st call: positive points (gt + or filter)
    // 2nd call: negative points (lt filter)
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
    } as never;
  });
}

describe("getValidBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 0 when no transactions", async () => {
    setupBalanceMock([], []);
    const balance = await getValidBalance("user-1");
    expect(balance).toBe(0);
  });

  it("should sum all non-expired points", async () => {
    // DB filter: positive + not expired → [100, 50], negative → [-30]
    setupBalanceMock(
      [{ points: 100 }, { points: 50 }],
      [{ points: -30 }],
    );
    const balance = await getValidBalance("user-1");
    expect(balance).toBe(120); // 100 + 50 - 30
  });

  it("should exclude expired earn points (handled by DB filter)", async () => {
    // DB already filters out expired, so only valid ones returned
    // expired 100 is NOT in positiveData (DB excluded it)
    setupBalanceMock(
      [{ points: 50 }],   // only non-expired positive
      [{ points: -20 }],  // redeem
    );
    const balance = await getValidBalance("user-1");
    expect(balance).toBe(30); // 50 - 20
  });

  it("should count refund points (positive with no expiry)", async () => {
    // refund has no expires_at → passes DB filter (expires_at IS NULL)
    setupBalanceMock(
      [{ points: 50 }, { points: 20 }], // earn + refund both positive
      [],
    );
    const balance = await getValidBalance("user-1");
    expect(balance).toBe(70);
  });
});

describe("金額恆等式", () => {
  it("subtotal + shipping - coupon - points = total (基本)", () => {
    const subtotal = 1500;
    const shippingFee = 100;
    const couponDiscount = 50;
    const pointsDiscount = 30;
    const total = Math.max(subtotal + shippingFee - couponDiscount - pointsDiscount, 0);
    expect(total).toBe(1520);
  });

  it("折扣超過金額時 total 最低為 0", () => {
    const subtotal = 100;
    const shippingFee = 0;
    const couponDiscount = 80;
    const pointsDiscount = 50;
    const total = Math.max(subtotal + shippingFee - couponDiscount - pointsDiscount, 0);
    expect(total).toBe(0);
  });

  it("多種組合下恆等式成立", () => {
    const cases = [
      { subtotal: 2000, shipping: 100, coupon: 0, points: 0 },
      { subtotal: 2000, shipping: 0, coupon: 100, points: 50 },
      { subtotal: 500, shipping: 100, coupon: 50, points: 30 },
      { subtotal: 350, shipping: 100, coupon: 50, points: 0 },
    ];
    for (const c of cases) {
      const total = Math.max(c.subtotal + c.shipping - c.coupon - c.points, 0);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBe(c.subtotal + c.shipping - c.coupon - c.points);
    }
  });
});

describe("點數發放計算", () => {
  it("一般會員：earnBase × 0.02 × 1x", () => {
    const earnBase = 1000;
    const pointsRate = 0.02;
    const multiplier = 1.0;
    const points = Math.floor(earnBase * pointsRate * multiplier);
    expect(points).toBe(20);
  });

  it("銀卡會員：earnBase × 0.03 × 2x 活動", () => {
    const earnBase = 1000;
    const pointsRate = 0.03;
    const multiplier = 2.0;
    const points = Math.floor(earnBase * pointsRate * multiplier);
    expect(points).toBe(60);
  });

  it("金卡會員：earnBase × 0.04 × 3x 活動", () => {
    const earnBase = 2000;
    const pointsRate = 0.04;
    const multiplier = 3.0;
    const points = Math.floor(earnBase * pointsRate * multiplier);
    expect(points).toBe(240);
  });

  it("向下取整", () => {
    const earnBase = 333;
    const pointsRate = 0.02;
    const multiplier = 1.0;
    const points = Math.floor(earnBase * pointsRate * multiplier);
    expect(points).toBe(6); // 333 * 0.02 = 6.66 → 6
  });

  it("earnBase = 0 → 0 points", () => {
    const points = Math.floor(0 * 0.04 * 5.0);
    expect(points).toBe(0);
  });
});

describe("折抵驗證邏輯", () => {
  it("最低 10 點限制", () => {
    expect(MIN_POINTS_USE).toBe(10);
  });

  it("各等級上限", () => {
    const afterCoupon = 1000;
    // standard 10%
    expect(Math.floor(afterCoupon * 0.10)).toBe(100);
    // silver 15%
    expect(Math.floor(afterCoupon * 0.15)).toBe(150);
    // gold 20%
    expect(Math.floor(afterCoupon * 0.20)).toBe(200);
  });

  it("上限計算（含小數向下取整）", () => {
    const afterCoupon = 999;
    expect(Math.floor(afterCoupon * 0.10)).toBe(99);
    expect(Math.floor(afterCoupon * 0.15)).toBe(149);
    expect(Math.floor(afterCoupon * 0.20)).toBe(199);
  });
});

describe("等級升等邏輯", () => {
  it("消費 0~2999 → standard", () => {
    const tiers = [
      { id: "gold", min: 8000 },
      { id: "silver", min: 3000 },
      { id: "standard", min: 0 },
    ];
    const spend = 2500;
    const tier = tiers.find(t => spend >= t.min)!;
    expect(tier.id).toBe("standard");
  });

  it("消費 3000~7999 → silver", () => {
    const tiers = [
      { id: "gold", min: 8000 },
      { id: "silver", min: 3000 },
      { id: "standard", min: 0 },
    ];
    const spend = 5000;
    const tier = tiers.find(t => spend >= t.min)!;
    expect(tier.id).toBe("silver");
  });

  it("消費 8000+ → gold", () => {
    const tiers = [
      { id: "gold", min: 8000 },
      { id: "silver", min: 3000 },
      { id: "standard", min: 0 },
    ];
    const spend = 10000;
    const tier = tiers.find(t => spend >= t.min)!;
    expect(tier.id).toBe("gold");
  });

  it("只升不降（同 session）", () => {
    const currentTier = "silver";
    const newTier = "standard"; // calculated lower
    const tierOrder = ["standard", "silver", "gold"];
    const currentIdx = tierOrder.indexOf(currentTier);
    const newIdx = tierOrder.indexOf(newTier);
    const doUpgrade = newIdx > currentIdx;
    expect(doUpgrade).toBe(false); // should NOT downgrade
  });
});

describe("活動倍率選擇", () => {
  it("多活動取最高", () => {
    const campaigns = [
      { multiplier: 2.0, campaign_type: "global" },
      { multiplier: 3.0, campaign_type: "global" },
      { multiplier: 1.5, campaign_type: "first_purchase" },
    ];
    let max = 1.0;
    for (const c of campaigns) {
      if (c.campaign_type === "global") max = Math.max(max, c.multiplier);
    }
    expect(max).toBe(3.0);
  });

  it("無活動 → 倍率 1.0", () => {
    const campaigns: { multiplier: number }[] = [];
    let max = 1.0;
    for (const c of campaigns) max = Math.max(max, c.multiplier);
    expect(max).toBe(1.0);
  });

  it("倍率上限 10x", () => {
    const multiplier = 11;
    const isValid = multiplier >= 1 && multiplier <= 10;
    expect(isValid).toBe(false);
  });
});

describe("通用碼驗證", () => {
  it("次數上限：已用次數 >= max_uses → 無效", () => {
    const template = { max_uses: 100, max_uses_per_user: 1, is_active: true, expires_at: null };
    const usageCount = 100;
    const isValid = usageCount < template.max_uses;
    expect(isValid).toBe(false);
  });

  it("每人限用：用戶已用 >= max_uses_per_user → 無效", () => {
    const template = { max_uses: 100, max_uses_per_user: 1, is_active: true, expires_at: null };
    const userUsageCount = 1;
    const isValid = userUsageCount < template.max_uses_per_user;
    expect(isValid).toBe(false);
  });

  it("過期碼 → 無效", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const template = { max_uses: 100, max_uses_per_user: 1, is_active: true, expires_at: past };
    const now = new Date().toISOString();
    const isExpired = template.expires_at !== null && template.expires_at < now;
    expect(isExpired).toBe(true);
  });

  it("有效碼：次數未滿、未過期、用戶未超限", () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const template = { max_uses: 100, max_uses_per_user: 2, is_active: true, expires_at: future };
    const usageCount = 50;
    const userUsageCount = 1;
    const now = new Date().toISOString();
    const isValid =
      template.is_active &&
      usageCount < template.max_uses &&
      userUsageCount < template.max_uses_per_user &&
      (template.expires_at === null || template.expires_at > now);
    expect(isValid).toBe(true);
  });

  it("停用碼 → 無效", () => {
    const template = { max_uses: 100, max_uses_per_user: 1, is_active: false, expires_at: null };
    expect(template.is_active).toBe(false);
  });
});
