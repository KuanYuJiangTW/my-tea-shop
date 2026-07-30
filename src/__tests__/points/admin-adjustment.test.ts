import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock } from "./helpers/supabase-mock";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/email", () => ({
  sendTierUpgradeEmail: vi.fn(),
  sendPointsExpiryEmail: vi.fn(),
  sendAnomalyAlertEmail: vi.fn(),
}));

// 此檔測 handler 邏輯，先假設已通過 withAdminAuth；
// 授權本身由 src/__tests__/admin/route-auth-coverage.test.ts 覆蓋
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "test-session" }) }),
}));
vi.mock("@/lib/admin-token", () => ({
  validateAdminSession: async () => true,
  getAdminActor: async () => "session:deadbeef1234",
}));

import { POST } from "@/app/api/admin/points-adjustment/route";

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin/points-adjustment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

// Setup getValidBalance mock — needs dual query pattern
function setupBalance(balance: number) {
  let callCount = 0;
  mockFrom.mockImplementation(() => {
    callCount++;
    if (callCount <= 2) {
      // getValidBalance: positive then negative
      if (callCount === 1) return createChainMock([{ points: balance }], null);
      return createChainMock([], null);
    }
    // insert call
    const chain = createChainMock({ id: "new-txn" }, null);
    return chain;
  });
}

describe("points-adjustment API", () => {
  // 5.2
  it("缺少必要欄位 → 400", async () => {
    const res = await POST(makeReq({ userId: "u1" })); // missing points, adminId
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("缺少必要欄位");
  });

  // 5.3
  it("未填 adminNote → 400", async () => {
    const res = await POST(makeReq({ userId: "u1", points: 10, adminId: "a1", adminNote: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("必須填寫調整原因");
  });

  // 5.4
  it("points = 0 → 400", async () => {
    const res = await POST(makeReq({ userId: "u1", points: 0, adminId: "a1", adminNote: "test" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("不可為 0");
  });

  // 5.5
  it("扣點超過餘額 → 400", async () => {
    setupBalance(50);
    const res = await POST(makeReq({ userId: "u1", points: -100, adminId: "a1", adminNote: "扣除" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("餘額不足");
    expect(json.error).toContain("50");
  });

  // 5.6
  it("加點成功 → ok: true", async () => {
    mockFrom.mockReturnValue(createChainMock({ id: "new-txn", points: 100 }, null));
    const res = await POST(makeReq({ userId: "u1", points: 100, adminId: "a1", adminNote: "補償" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  // 5.7
  it("扣點成功（餘額足夠）→ ok: true", async () => {
    setupBalance(200);
    // Override the 3rd call (insert) to return success
    const origImpl = mockFrom.getMockImplementation();
    let realCallCount = 0;
    mockFrom.mockImplementation((...args: unknown[]) => {
      realCallCount++;
      if (realCallCount <= 2) return origImpl!(...args);
      return createChainMock({ id: "new-txn", points: -50 }, null);
    });

    const res = await POST(makeReq({ userId: "u1", points: -50, adminId: "a1", adminNote: "扣除" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
