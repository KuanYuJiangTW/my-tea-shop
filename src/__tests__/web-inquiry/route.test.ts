import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFrom, mockRateLimit, mockSendWebInquiryEmail, mockInsert } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRateLimit: vi.fn(),
  mockSendWebInquiryEmail: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: mockFrom } }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/email", () => ({
  sendWebInquiryEmail: (...args: unknown[]) => mockSendWebInquiryEmail(...args),
}));

import { POST } from "@/app/api/web-inquiry/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_BODY = {
  referralSource: "site",
  industryBrand: "手作烘焙工作室",
  painPoints: ["noWebsite", "seo"],
  budgetRange: "50to150k",
  timeline: "within1m",
  contactName: "王小明",
  contactLine: "wang123",
  contactEmail: "",
  contactTime: "平日晚上",
  locale: "zh",
};

function makeRequest(body: unknown) {
  return new NextRequest("https://taiwantea.store/api/web-inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupInsertMock(overrides: { error?: unknown } = {}) {
  mockInsert.mockResolvedValue({ error: overrides.error ?? null });
  mockFrom.mockImplementation((table: string) => {
    if (table === "web_inquiries") {
      return { insert: mockInsert };
    }
    return {};
  });
}

beforeEach(() => {
  mockFrom.mockReset();
  mockInsert.mockReset();
  mockRateLimit.mockReset();
  mockSendWebInquiryEmail.mockReset();
  mockRateLimit.mockResolvedValue(true);
  mockSendWebInquiryEmail.mockResolvedValue(undefined);
  setupInsertMock();
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/web-inquiry", () => {
  it("合法提交寫入 web_inquiries 並回 200", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("web_inquiries");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        referral_source: "site",
        industry_brand: "手作烘焙工作室",
        pain_points: ["noWebsite", "seo"],
        budget_range: "50to150k",
        timeline: "within1m",
        contact_name: "王小明",
        contact_line: "wang123",
        contact_email: null,
        locale: "zh",
      }),
    );
    expect(mockSendWebInquiryEmail).toHaveBeenCalledTimes(1);
  });

  it("白名單外的預算值回 400，且不寫入資料庫", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, budgetRange: "1000000" }));
    expect(res.status).toBe(400);

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSendWebInquiryEmail).not.toHaveBeenCalled();
  });

  it("白名單外的認識管道回 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, referralSource: "hack" }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("白名單外的痛點複選值回 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, painPoints: ["noWebsite", "not-a-real-option"] }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("honeypot 欄位有值 → 回 200 但靜默丟棄（不寫庫、不寄信）", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, website: "http://spam.example" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSendWebInquiryEmail).not.toHaveBeenCalled();
  });

  it("寄信拋出例外仍回 200，資料已落庫", async () => {
    mockSendWebInquiryEmail.mockRejectedValue(new Error("Resend down"));
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("web_inquiries");
  });

  it("超過 rate limit 時回 429，不寫入資料庫", async () => {
    mockRateLimit.mockResolvedValue(false);
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(429);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSendWebInquiryEmail).not.toHaveBeenCalled();
  });

  it("缺少必填姓名回 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, contactName: "" }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("LINE 與 Email 皆空回 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, contactLine: "", contactEmail: "" }));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("insert 失敗時回 500", async () => {
    setupInsertMock({ error: { message: "db error" } });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect(mockSendWebInquiryEmail).not.toHaveBeenCalled();
  });
});
