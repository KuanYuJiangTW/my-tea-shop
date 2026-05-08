import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFrom, mockVerifyPayPalWebhook, mockProcessPayPalCapture } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockVerifyPayPalWebhook: vi.fn(),
  mockProcessPayPalCapture: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: mockFrom } }));
vi.mock("@/lib/paypal", () => ({
  verifyPayPalWebhook: (...args: unknown[]) => mockVerifyPayPalWebhook(...args),
  processPayPalCapture: (...args: unknown[]) => mockProcessPayPalCapture(...args),
}));

import { POST } from "@/app/api/paypal/webhook/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWebhookRequest(event: unknown) {
  const body = JSON.stringify(event);
  return new NextRequest("https://taiwantea.store/api/paypal/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://paypal.com/cert",
      "paypal-transmission-id": "tx-1",
      "paypal-transmission-sig": "sig-abc",
      "paypal-transmission-time": "2026-01-01T00:00:00Z",
    },
    body,
  });
}

const ORDER_ROW = {
  id: "order-abc",
  payment_status: "pending",
  paypal_order_id: "PAYPAL-123",
};

function setupOrderLookup(order: unknown) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: order, error: order ? null : { message: "not found" } }),
      }),
    }),
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockVerifyPayPalWebhook.mockReset();
  mockProcessPayPalCapture.mockReset();
  mockFrom.mockReset();
  mockVerifyPayPalWebhook.mockResolvedValue(true);
  mockProcessPayPalCapture.mockResolvedValue({ success: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/paypal/webhook", () => {
  it("should return 401 if signature verification fails", async () => {
    mockVerifyPayPalWebhook.mockResolvedValue(false);

    const res = await POST(
      makeWebhookRequest({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "PAYPAL-123" } }),
    );

    expect(res.status).toBe(401);
    expect(mockProcessPayPalCapture).not.toHaveBeenCalled();
  });

  it("should process CHECKOUT.ORDER.APPROVED and capture", async () => {
    setupOrderLookup(ORDER_ROW);

    const res = await POST(
      makeWebhookRequest({
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: "PAYPAL-123" },
      }),
    );

    expect(res.status).toBe(200);
    expect(mockProcessPayPalCapture).toHaveBeenCalledWith("order-abc", "PAYPAL-123");
  });

  it("should process PAYMENT.CAPTURE.COMPLETED", async () => {
    setupOrderLookup(ORDER_ROW);

    const res = await POST(
      makeWebhookRequest({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          supplementary_data: {
            related_ids: { order_id: "PAYPAL-123" },
          },
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(mockProcessPayPalCapture).toHaveBeenCalledWith("order-abc", "PAYPAL-123");
  });

  it("should return 200 OK if order not found in DB (no retry)", async () => {
    setupOrderLookup(null);

    const res = await POST(
      makeWebhookRequest({
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: "PAYPAL-UNKNOWN" },
      }),
    );

    expect(res.status).toBe(200);
    expect(mockProcessPayPalCapture).not.toHaveBeenCalled();
  });

  it("should skip capture if order is already paid (idempotent)", async () => {
    setupOrderLookup({ ...ORDER_ROW, payment_status: "paid" });

    const res = await POST(
      makeWebhookRequest({
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: "PAYPAL-123" },
      }),
    );

    expect(res.status).toBe(200);
    expect(mockProcessPayPalCapture).not.toHaveBeenCalled();
  });

  it("should return 200 even if capture fails (avoid webhook retry loop)", async () => {
    setupOrderLookup(ORDER_ROW);
    mockProcessPayPalCapture.mockRejectedValue(new Error("Capture failed"));

    const res = await POST(
      makeWebhookRequest({
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: "PAYPAL-123" },
      }),
    );

    expect(res.status).toBe(200);
  });

  it("should return 200 for unrelated event types", async () => {
    const res = await POST(
      makeWebhookRequest({
        event_type: "BILLING.SUBSCRIPTION.CREATED",
        resource: { id: "SUB-1" },
      }),
    );

    expect(res.status).toBe(200);
    expect(mockProcessPayPalCapture).not.toHaveBeenCalled();
  });

  it("should return 200 if paypalOrderId cannot be extracted", async () => {
    const res = await POST(
      makeWebhookRequest({
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: {},
      }),
    );

    expect(res.status).toBe(200);
    expect(mockProcessPayPalCapture).not.toHaveBeenCalled();
  });
});
