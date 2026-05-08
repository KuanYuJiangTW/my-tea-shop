import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { TEST_USER } from "./helpers";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFrom, mockGetUser, mockProcessPayPalCapture } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockProcessPayPalCapture: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: mockFrom } }));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));
vi.mock("@/lib/paypal", () => ({
  processPayPalCapture: (...args: unknown[]) => mockProcessPayPalCapture(...args),
}));
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({ isLimited: () => false, record: () => {} }),
  getClientIp: () => "127.0.0.1",
}));

import { POST } from "@/app/api/paypal/capture/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest("https://taiwantea.store/api/paypal/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ORDER_ROW = {
  id: "order-abc",
  user_id: TEST_USER.id,
  payment_status: "pending",
  paypal_order_id: "PAYPAL-123",
};

function setupOrderLookup(order: unknown, error: unknown = null) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: order, error }),
      }),
    }),
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetUser.mockReset();
  mockProcessPayPalCapture.mockReset();
  mockFrom.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });
  mockProcessPayPalCapture.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/paypal/capture", () => {
  it("should capture successfully and return orderId", async () => {
    setupOrderLookup(ORDER_ROW);

    const res = await POST(makeRequest({ paypalOrderId: "PAYPAL-123" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.dbOrderId).toBe("order-abc");
    expect(mockProcessPayPalCapture).toHaveBeenCalledWith("order-abc", "PAYPAL-123");
  });

  it("should return 401 if not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ paypalOrderId: "PAYPAL-123" }));
    expect(res.status).toBe(401);
  });

  it("should return 400 if paypalOrderId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("should return 404 if order not found", async () => {
    setupOrderLookup(null, { message: "not found" });

    const res = await POST(makeRequest({ paypalOrderId: "PAYPAL-999" }));
    expect(res.status).toBe(404);
  });

  it("should return 403 if order belongs to another user", async () => {
    setupOrderLookup({ ...ORDER_ROW, user_id: "other-user" });

    const res = await POST(makeRequest({ paypalOrderId: "PAYPAL-123" }));
    expect(res.status).toBe(403);
  });

  it("should return success immediately if already paid (idempotent)", async () => {
    setupOrderLookup({ ...ORDER_ROW, payment_status: "paid" });

    const res = await POST(makeRequest({ paypalOrderId: "PAYPAL-123" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockProcessPayPalCapture).not.toHaveBeenCalled();
  });

  it("should return 400 on capture failure", async () => {
    setupOrderLookup(ORDER_ROW);
    mockProcessPayPalCapture.mockRejectedValue(new Error("Capture failed"));

    const res = await POST(makeRequest({ paypalOrderId: "PAYPAL-123" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Capture failed");
  });

  it("should pass alreadyProcessed flag through", async () => {
    setupOrderLookup(ORDER_ROW);
    mockProcessPayPalCapture.mockResolvedValue({ success: true, alreadyProcessed: true });

    const res = await POST(makeRequest({ paypalOrderId: "PAYPAL-123" }));
    const json = await res.json();

    expect(json.alreadyProcessed).toBe(true);
  });
});
