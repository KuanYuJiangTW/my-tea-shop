import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mocks (available inside vi.mock factories) ─────────────────────
const { mockFetch, mockSupabase, mockSendOrderEmails } = vi.hoisted(() => {
  const mockFetch = vi.fn();
  const mockSupabase = { from: vi.fn(), rpc: vi.fn() };
  const mockSendOrderEmails = vi.fn().mockResolvedValue(undefined);
  return { mockFetch, mockSupabase, mockSendOrderEmails };
});

vi.stubGlobal("fetch", mockFetch);
vi.mock("@/lib/supabase", () => ({ supabase: mockSupabase }));
vi.mock("@/lib/email", () => ({ sendOrderEmails: mockSendOrderEmails }));

// ─── Helper: dynamic import for fresh module (resets token cache) ───────────
async function freshImport() {
  vi.resetModules();
  const mod = await import("@/lib/paypal");
  return mod;
}

beforeEach(() => {
  vi.stubEnv("PAYPAL_CLIENT_ID", "test-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-secret");
  vi.stubEnv("PAYPAL_MODE", "sandbox");
  vi.stubEnv("PAYPAL_WEBHOOK_ID", "webhook-123");
  mockFetch.mockReset();
  mockSupabase.from.mockReset();
  mockSupabase.rpc.mockReset();
  mockSendOrderEmails.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── Helper: mock a successful auth response ─────────────────────────────────
function mockAuth() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ access_token: "tok", expires_in: 3600 }),
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// getPayPalAccessToken
// ═════════════════════════════════════════════════════════════════════════════

describe("getPayPalAccessToken", () => {
  it("should fetch and return access token", async () => {
    const { getPayPalAccessToken } = await freshImport();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "tok-abc", expires_in: 3600 }),
    });

    const token = await getPayPalAccessToken();

    expect(token).toBe("tok-abc");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should use cached token on second call", async () => {
    const { getPayPalAccessToken } = await freshImport();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "tok-cached", expires_in: 3600 }),
    });

    const first = await getPayPalAccessToken();
    const second = await getPayPalAccessToken();

    expect(first).toBe("tok-cached");
    expect(second).toBe("tok-cached");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw on auth failure", async () => {
    const { getPayPalAccessToken } = await freshImport();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(getPayPalAccessToken()).rejects.toThrow("PayPal auth failed: 401");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// createPayPalOrder
// ═════════════════════════════════════════════════════════════════════════════

describe("createPayPalOrder", () => {
  it("should return paypalOrderId and approveUrl", async () => {
    const { createPayPalOrder } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "PAYPAL-123",
        links: [
          { rel: "self", href: "https://api.paypal.com/self" },
          { rel: "payer-action", href: "https://paypal.com/approve/PAYPAL-123" },
        ],
      }),
    });

    const result = await createPayPalOrder(1200, "order-abc", "https://example.com/success", "https://example.com/cancel");

    expect(result.paypalOrderId).toBe("PAYPAL-123");
    expect(result.approveUrl).toBe("https://paypal.com/approve/PAYPAL-123");
  });

  // shipping_preference 沒明寫時 PayPal 預設 GET_FROM_FILE，會忽略我們傳過去的
  // purchase_unit.shipping。這兩個測試釘住的是「地址由誰決定」，不是欄位長相。
  it("國際單（有地址）用 SET_PROVIDED_ADDRESS，並帶入我方地址", async () => {
    const { createPayPalOrder } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "PAYPAL-INTL",
        links: [{ rel: "payer-action", href: "https://paypal.com/approve/PAYPAL-INTL" }],
      }),
    });

    await createPayPalOrder(2550, "order-intl", "https://a.com/s", "https://a.com/c", {
      fullName: "Mr Tai Ma",
      addressLine1: "341 Mains Road",
      city: "Sunnybank",
      state: "QLD",
      postalCode: "4109",
      countryCode: "AU",
    });

    const body = JSON.parse(mockFetch.mock.calls.at(-1)![1].body as string);
    expect(body.payment_source.paypal.experience_context.shipping_preference)
      .toBe("SET_PROVIDED_ADDRESS");
    expect(body.purchase_units[0].shipping.address).toMatchObject({
      address_line_1: "341 Mains Road",
      admin_area_2: "Sunnybank",
      admin_area_1: "QLD",
      postal_code: "4109",
      country_code: "AU",
    });
  });

  it("國內單（無地址）用 NO_SHIPPING，不讓 PayPal 再問一次地址", async () => {
    const { createPayPalOrder } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "PAYPAL-DOM",
        links: [{ rel: "payer-action", href: "https://paypal.com/approve/PAYPAL-DOM" }],
      }),
    });

    await createPayPalOrder(1200, "order-dom", "https://a.com/s", "https://a.com/c");

    const body = JSON.parse(mockFetch.mock.calls.at(-1)![1].body as string);
    expect(body.payment_source.paypal.experience_context.shipping_preference)
      .toBe("NO_SHIPPING");
    expect(body.purchase_units[0].shipping).toBeUndefined();
  });

  it("should throw if no payer-action link", async () => {
    const { createPayPalOrder } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "PAYPAL-123", links: [] }),
    });

    await expect(
      createPayPalOrder(1200, "order-abc", "https://a.com/s", "https://a.com/c"),
    ).rejects.toThrow("approve URL not found");
  });

  it("should throw on PayPal API error", async () => {
    const { createPayPalOrder } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    });

    await expect(
      createPayPalOrder(1200, "order-abc", "https://a.com/s", "https://a.com/c"),
    ).rejects.toThrow("PayPal create order failed: 400");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// capturePayPalOrder
// ═════════════════════════════════════════════════════════════════════════════

describe("capturePayPalOrder", () => {
  it("should return capture data on success", async () => {
    const { capturePayPalOrder } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "COMPLETED", id: "CAP-1" }),
    });

    const result = await capturePayPalOrder("PAYPAL-123");
    expect(result.status).toBe("COMPLETED");
  });

  it("should treat ORDER_ALREADY_CAPTURED as success", async () => {
    const { capturePayPalOrder } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }),
    });

    const result = await capturePayPalOrder("PAYPAL-123");
    expect(result.status).toBe("COMPLETED");
    expect(result.alreadyCaptured).toBe(true);
  });

  it("should throw on other errors", async () => {
    const { capturePayPalOrder } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal error",
    });

    await expect(capturePayPalOrder("PAYPAL-123")).rejects.toThrow("PayPal capture failed: 500");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// verifyPayPalWebhook
// ═════════════════════════════════════════════════════════════════════════════

describe("verifyPayPalWebhook", () => {
  const webhookHeaders = {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://paypal.com/cert",
    "paypal-transmission-id": "tx-1",
    "paypal-transmission-sig": "sig-abc",
    "paypal-transmission-time": "2026-01-01T00:00:00Z",
  };

  it("should return true on SUCCESS verification", async () => {
    const { verifyPayPalWebhook } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ verification_status: "SUCCESS" }),
    });

    const result = await verifyPayPalWebhook(webhookHeaders, '{"event_type":"test"}');
    expect(result).toBe(true);
  });

  it("should return false on FAILURE verification", async () => {
    const { verifyPayPalWebhook } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ verification_status: "FAILURE" }),
    });

    const result = await verifyPayPalWebhook(webhookHeaders, '{"event_type":"test"}');
    expect(result).toBe(false);
  });

  it("should return false when PAYPAL_WEBHOOK_ID is missing", async () => {
    const { verifyPayPalWebhook } = await freshImport();
    vi.stubEnv("PAYPAL_WEBHOOK_ID", "");

    const result = await verifyPayPalWebhook(webhookHeaders, '{"event_type":"test"}');
    expect(result).toBe(false);
  });

  it("should return false on API error", async () => {
    const { verifyPayPalWebhook } = await freshImport();
    mockAuth();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await verifyPayPalWebhook(webhookHeaders, '{"event_type":"test"}');
    expect(result).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// processPayPalCapture
// ═════════════════════════════════════════════════════════════════════════════

describe("processPayPalCapture", () => {
  const orderRow = {
    id: "order-abc",
    payment_status: "pending",
    items: [{ productId: 1, quantity: 2, spec: "150g" }],
    customer_name: "測試",
    customer_email: "t@e.com",
    shipping_address: { type: "home", city: "台北", address: "某路" },
    shipping_fee: 0,
    total_amount: 1200,
    note: null,
  };

  function setupMocks(overrides: { orderStatus?: string; captureStatus?: string; updateReturns?: boolean } = {}) {
    const status = overrides.orderStatus ?? "pending";

    // fetch: auth + capture
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: overrides.captureStatus ?? "COMPLETED" }),
    });

    const updatedRow = overrides.updateReturns === false ? null : { ...orderRow, payment_status: "paid" };

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...orderRow, payment_status: status },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedRow,
                error: updatedRow ? null : { message: "not found" },
              }),
            }),
          }),
        }),
      }),
    }));

    mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
  }

  it("should capture, update order, deduct stock, and send email", async () => {
    const { processPayPalCapture } = await freshImport();
    setupMocks();

    const result = await processPayPalCapture("order-abc", "PAYPAL-123");

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBeUndefined();
    expect(mockSendOrderEmails).toHaveBeenCalled();
  });

  it("should return alreadyProcessed if order is already paid (idempotent)", async () => {
    const { processPayPalCapture } = await freshImport();
    setupMocks({ orderStatus: "paid" });

    const result = await processPayPalCapture("order-abc", "PAYPAL-123");

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
  });

  it("should throw if capture status is not COMPLETED", async () => {
    const { processPayPalCapture } = await freshImport();
    setupMocks({ captureStatus: "PENDING" });

    await expect(processPayPalCapture("order-abc", "PAYPAL-123")).rejects.toThrow(
      "PayPal capture status: PENDING",
    );
  });

  it("should handle race condition (update returns null)", async () => {
    const { processPayPalCapture } = await freshImport();
    setupMocks({ updateReturns: false });

    const result = await processPayPalCapture("order-abc", "PAYPAL-123");

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
  });
});
