import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// rate-limit.ts 在模組載入時會 import supabase（service_role），測試環境無金鑰會丟錯，故 mock。
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: vi.fn() } }));
import { getClientIp } from "@/lib/rate-limit";

// 限流已改為持久化（Supabase RPC），演算法測試見 paypal/rate-limit.test.ts。
// 此處保留 getClientIp 的解析測試。
describe("getClientIp", () => {
  it("x-real-ip 優先於 x-forwarded-for（防偽造）", () => {
    const req = new NextRequest("http://localhost/test", {
      headers: { "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("無 x-real-ip 時備援取 x-forwarded-for 最左 IP", () => {
    const req = new NextRequest("http://localhost/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("無 header 回傳 unknown", () => {
    const req = new NextRequest("http://localhost/test");
    expect(getClientIp(req)).toBe("unknown");
  });
});
