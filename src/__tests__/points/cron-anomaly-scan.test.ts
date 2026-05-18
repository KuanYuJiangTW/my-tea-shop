import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainMock, createCronRequest } from "./helpers/supabase-mock";

const mockFrom = vi.fn();
const mockSendAnomalyEmail = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/email", () => ({
  sendAnomalyAlertEmail: (...args: unknown[]) => mockSendAnomalyEmail(...args),
}));

import { GET } from "@/app/api/cron/points-anomaly-scan/route";

const CRON_SECRET = "test-secret";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
  process.env.ADMIN_EMAIL = "admin@test.com";
});

function setupQueries(flagged: unknown[], redeems: unknown[]) {
  let callCount = 0;
  mockFrom.mockImplementation(() => {
    callCount++;
    // 1st call = flagged query, 2nd = redeems query
    if (callCount === 1) return createChainMock(flagged, null);
    return createChainMock(redeems, null);
  });
}

describe("points-anomaly-scan cron", () => {
  // 3.2
  it("無異常 → anomalies: 0 + 不發 email", async () => {
    setupQueries([], []);
    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.anomalies).toBe(0);
    expect(mockSendAnomalyEmail).not.toHaveBeenCalled();
  });

  // 3.3
  it("有 flagged 記錄 → 發 email, flaggedCount > 0", async () => {
    setupQueries(
      [{ id: "t1", user_id: "u1234567-xxxx", points: 200, multiplier: 8, description: "測試", created_at: new Date().toISOString() }],
      [],
    );
    mockSendAnomalyEmail.mockResolvedValue(undefined);

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.flaggedCount).toBe(1);
    expect(json.excessiveCount).toBe(0);
    expect(mockSendAnomalyEmail).toHaveBeenCalledWith(expect.objectContaining({
      adminEmail: "admin@test.com",
      flaggedCount: 1,
      excessiveRedeemCount: 0,
    }));
  });

  // 3.4
  it("超額折抵（> 500）→ excessiveRedeemCount > 0", async () => {
    setupQueries([], [
      { user_id: "u1", points: -300 },
      { user_id: "u1", points: -250 },
    ]);
    mockSendAnomalyEmail.mockResolvedValue(undefined);

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.excessiveCount).toBe(1);
    expect(mockSendAnomalyEmail).toHaveBeenCalled();
  });

  // 3.5
  it("剛好 500 不算超額", async () => {
    setupQueries([], [
      { user_id: "u1", points: -250 },
      { user_id: "u1", points: -250 },
    ]);

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.anomalies).toBe(0);
    expect(mockSendAnomalyEmail).not.toHaveBeenCalled();
  });

  // 3.6
  it("同時有 flagged + 超額 → email 包含兩類", async () => {
    setupQueries(
      [{ id: "t1", user_id: "u1234567-xxxx", points: 500, multiplier: 10, description: "異常", created_at: new Date().toISOString() }],
      [
        { user_id: "u2", points: -600 },
      ],
    );
    mockSendAnomalyEmail.mockResolvedValue(undefined);

    const res = await GET(createCronRequest(CRON_SECRET));
    const json = await res.json();
    expect(json.flaggedCount).toBe(1);
    expect(json.excessiveCount).toBe(1);
    expect(mockSendAnomalyEmail).toHaveBeenCalledWith(expect.objectContaining({
      flaggedCount: 1,
      excessiveRedeemCount: 1,
    }));
  });
});
