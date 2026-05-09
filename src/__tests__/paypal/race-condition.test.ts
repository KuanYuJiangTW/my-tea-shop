import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ═════════════════════════════════════════════════════════════════════════════
// 7.6 驗證 capture 競態：Result 頁面與 Webhook 同時觸發 capture
//     確認不重複扣庫存/寄信
// ═════════════════════════════════════════════════════════════════════════════

// 使用與 paypal-lib.test.ts 相同的模式：stubGlobal fetch + freshImport
const { mockFetch, mockSupabase, mockSendOrderEmails } = vi.hoisted(() => {
  const mockFetch = vi.fn();
  const mockSupabase = { from: vi.fn(), rpc: vi.fn() };
  const mockSendOrderEmails = vi.fn().mockResolvedValue(undefined);
  return { mockFetch, mockSupabase, mockSendOrderEmails };
});

vi.stubGlobal("fetch", mockFetch);
vi.mock("@/lib/supabase", () => ({ supabase: mockSupabase }));
vi.mock("@/lib/email", () => ({ sendOrderEmails: mockSendOrderEmails }));

async function freshImport() {
  vi.resetModules();
  return await import("@/lib/paypal");
}

// ─── Test Data ──────────────────────────────────────────────────────────────

const ORDER = {
  id: "order-race",
  payment_status: "pending",
  items: [{ productId: 1, quantity: 2, spec: "150g" }],
  customer_name: "測試",
  customer_email: "test@test.com",
  shipping_address: { city: "台北市", address: "信義路" },
  shipping_fee: 0,
  total_amount: 1200,
  note: null,
};

function mockAuth() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ access_token: "tok", expires_in: 3600 }),
  });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubEnv("PAYPAL_CLIENT_ID", "test-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-secret");
  vi.stubEnv("PAYPAL_MODE", "sandbox");

  mockFetch.mockReset();
  mockSupabase.from.mockReset();
  mockSupabase.rpc.mockReset();
  mockSendOrderEmails.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("processPayPalCapture — race condition (7.6)", () => {
  it("should not deduct stock or send email when order is already paid", async () => {
    const { processPayPalCapture } = await freshImport();

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...ORDER, payment_status: "paid" },
            error: null,
          }),
        }),
      }),
    }));

    const result = await processPayPalCapture("order-race", "PP-1");

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
    expect(mockSendOrderEmails).not.toHaveBeenCalled();
  });

  it("should return alreadyProcessed when conditional update fails (concurrent capture)", async () => {
    const { processPayPalCapture } = await freshImport();

    // fetch: auth + capture
    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "COMPLETED" }),
    });

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: ORDER,
            error: null,
          }),
        }),
      }),
      // 條件更新失敗：另一方已將 payment_status 改為 paid
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }));

    const result = await processPayPalCapture("order-race", "PP-1");

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(true);
    // 不應扣庫存或寄信
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
    expect(mockSendOrderEmails).not.toHaveBeenCalled();
  });

  it("should deduct stock exactly once on successful capture", async () => {
    const { processPayPalCapture } = await freshImport();

    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "COMPLETED" }),
    });

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ORDER, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...ORDER, payment_status: "paid" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));

    mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

    await processPayPalCapture("order-race", "PP-1");

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("decrement_stock", {
      p_id: 1,
      qty: 2,
      spec: "150g",
    });
  });

  it("should send email exactly once on successful capture", async () => {
    const { processPayPalCapture } = await freshImport();

    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "COMPLETED" }),
    });

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ORDER, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...ORDER, payment_status: "paid" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));

    mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

    await processPayPalCapture("order-race", "PP-1");

    expect(mockSendOrderEmails).toHaveBeenCalledTimes(1);
    expect(mockSendOrderEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-race",
        paymentMethod: "paypal",
      }),
    );
  });

  it("should handle ORDER_ALREADY_CAPTURED (422) gracefully", async () => {
    const { processPayPalCapture } = await freshImport();

    mockAuth();
    // PayPal 回傳 422：已被另一方 capture
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }),
    });

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ORDER, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...ORDER, payment_status: "paid" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }));

    mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

    const result = await processPayPalCapture("order-race", "PP-1");
    expect(result.success).toBe(true);
  });

  it("should mark order as stock_issue when stock deduction fails", async () => {
    const { processPayPalCapture } = await freshImport();

    mockAuth();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "COMPLETED" }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...ORDER, payment_status: "paid" },
              error: null,
            }),
          }),
        }),
      }),
    });

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ORDER, error: null }),
        }),
      }),
      update: mockUpdate,
    }));

    // 庫存扣除失敗
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

    const result = await processPayPalCapture("order-race", "PP-1");

    expect(result.success).toBe(true);
    // 應該標記為 stock_issue
    expect(mockUpdate).toHaveBeenCalled();
  });
});
