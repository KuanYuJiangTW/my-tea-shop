import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MOCK_COUNTRIES, MOCK_ZONES } from "./helpers";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: mockFrom } }));

import { GET } from "@/app/api/shipping/countries/route";

function setupMocks(overrides: {
  countries?: { data: unknown; error: unknown };
  zones?: { data: unknown; error: unknown };
} = {}) {
  const countriesResult = overrides.countries ?? { data: MOCK_COUNTRIES, error: null };
  const zonesResult = overrides.zones ?? { data: MOCK_ZONES, error: null };

  mockFrom.mockImplementation((table: string) => {
    if (table === "shipping_countries") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(countriesResult),
          }),
        }),
      };
    }
    if (table === "shipping_zones") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(zonesResult),
        }),
      };
    }
    return {};
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/shipping/countries", () => {
  it("returns all active countries with zone info", async () => {
    setupMocks();
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(MOCK_COUNTRIES.length);
  });

  it("each country has required fields", async () => {
    setupMocks();
    const res = await GET();
    const json = await res.json();
    for (const c of json) {
      expect(c).toHaveProperty("countryCode");
      expect(c).toHaveProperty("countryName");
      expect(c).toHaveProperty("countryNameEn");
      expect(c).toHaveProperty("zoneCode");
      expect(c).toHaveProperty("baseFee");
      expect(c).toHaveProperty("perExtra");
      expect(c).toHaveProperty("estimatedDaysMin");
      expect(c).toHaveProperty("estimatedDaysMax");
    }
  });

  it("maps zone fee data correctly to Japan (ASIA_1)", async () => {
    setupMocks();
    const res = await GET();
    const json = await res.json();
    const jp = json.find((c: { countryCode: string }) => c.countryCode === "JP");
    expect(jp).toBeDefined();
    expect(jp.baseFee).toBe(160);
    expect(jp.perExtra).toBe(10);
    expect(jp.estimatedDaysMin).toBe(7);
    expect(jp.estimatedDaysMax).toBe(14);
  });

  it("maps zone fee data correctly to US (NA_OC)", async () => {
    setupMocks();
    const res = await GET();
    const json = await res.json();
    const us = json.find((c: { countryCode: string }) => c.countryCode === "US");
    expect(us).toBeDefined();
    expect(us.baseFee).toBe(280);
    expect(us.perExtra).toBe(18);
  });

  it("returns 500 when countries query fails", async () => {
    setupMocks({ countries: { data: null, error: { message: "DB error" } } });
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 500 when zones query fails", async () => {
    setupMocks({ zones: { data: null, error: { message: "DB error" } } });
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
