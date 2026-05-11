import { vi } from "vitest";

// ─── Supabase mock builder ──────────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown };

export function mockSupabaseChain(result: ChainResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const terminal = vi.fn().mockResolvedValue(result);

  const proxy: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "then") return undefined;
        if (["single", "maybeSingle"].includes(prop)) return terminal;
        if (!chain[prop]) chain[prop] = vi.fn().mockReturnValue(proxy);
        return chain[prop];
      },
    },
  );

  return { proxy, terminal, chain };
}

// ─── International test data ────────────────────────────────────────────────

export const INTL_ADDRESS_JP = {
  country: "JP",
  countryName: "日本",
  state: "Tokyo",
  city: "Shibuya",
  addressLine1: "1-2-3 Shibuya",
  addressLine2: "Apt 201",
  postalCode: "150-0002",
};

export const INTL_ADDRESS_US = {
  country: "US",
  countryName: "United States",
  state: "California",
  city: "Los Angeles",
  addressLine1: "123 Main St",
  addressLine2: "",
  postalCode: "90001",
};

export const INTL_ADDRESS_DE = {
  country: "DE",
  countryName: "Germany",
  state: "Bavaria",
  city: "Munich",
  addressLine1: "Hauptstraße 10",
  addressLine2: "",
  postalCode: "80331",
};

export const MOCK_ZONES = [
  { zone_code: "ASIA_1", zone_name: "亞洲一區", zone_name_en: "Asia Zone 1", base_fee: 160, per_extra: 10, estimated_days_min: 7, estimated_days_max: 14, is_active: true },
  { zone_code: "ASIA_2", zone_name: "亞洲二區", zone_name_en: "Asia Zone 2", base_fee: 200, per_extra: 14, estimated_days_min: 7, estimated_days_max: 14, is_active: true },
  { zone_code: "NA_OC", zone_name: "北美大洋洲", zone_name_en: "North America & Oceania", base_fee: 280, per_extra: 18, estimated_days_min: 10, estimated_days_max: 21, is_active: true },
  { zone_code: "EU_1", zone_name: "歐洲一區", zone_name_en: "Europe Zone 1", base_fee: 280, per_extra: 18, estimated_days_min: 10, estimated_days_max: 21, is_active: true },
  { zone_code: "EU_2", zone_name: "歐洲二區", zone_name_en: "Europe Zone 2", base_fee: 330, per_extra: 22, estimated_days_min: 14, estimated_days_max: 28, is_active: true },
];

export const MOCK_COUNTRIES = [
  { country_code: "JP", country_name: "日本", country_name_en: "Japan", zone_code: "ASIA_1", is_active: true },
  { country_code: "KR", country_name: "韓國", country_name_en: "South Korea", zone_code: "ASIA_1", is_active: true },
  { country_code: "SG", country_name: "新加坡", country_name_en: "Singapore", zone_code: "ASIA_2", is_active: true },
  { country_code: "US", country_name: "美國", country_name_en: "United States", zone_code: "NA_OC", is_active: true },
  { country_code: "AU", country_name: "澳洲", country_name_en: "Australia", zone_code: "NA_OC", is_active: true },
  { country_code: "DE", country_name: "德國", country_name_en: "Germany", zone_code: "EU_1", is_active: true },
  { country_code: "GB", country_name: "英國", country_name_en: "United Kingdom", zone_code: "EU_1", is_active: true },
];

export const TEST_USER = { id: "user-123", email: "test@example.com" };

export const TEST_PRODUCT = {
  id: 1,
  name: "高山烏龍茶",
  name_en: "High Mountain Oolong",
  price: 600,
  price_75g: 350,
  price_tea_bag: 280,
  stock_quantity: 50,
  stock_75g: 30,
  stock_tea_bag: 40,
};

export const INTL_ORDER_BODY = {
  customer: { name: "Tanaka Taro", email: "tanaka@example.com", phone: "+81-90-1234-5678" },
  paymentMethod: "paypal" as const,
  deliveryType: "international" as const,
  internationalAddress: INTL_ADDRESS_JP,
  items: [{ productId: 1, quantity: 2, spec: "150g" as const }],
};

export function createMockRequest(
  body: unknown,
  options: { origin?: string; forwardedFor?: string } = {},
) {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.forwardedFor ? { "x-forwarded-for": options.forwardedFor } : {}),
  });

  return {
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: {
      get: (key: string) => headers.get(key),
    },
  } as unknown;
}
