import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// 持久化限流改用 Supabase RPC，這裡 mock supabase 驗證 helper 行為
const mockRpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("rateLimit（持久化）", () => {
  beforeEach(() => mockRpc.mockReset());

  it("RPC 回傳 data=true → 允許", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    expect(await rateLimit("k", 5, 60_000)).toBe(true);
  });

  it("RPC 回傳 data=false → 阻擋", async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    expect(await rateLimit("k", 5, 60_000)).toBe(false);
  });

  it("RPC 回傳 error → fail-open（允許，避免限流故障擋住所有人）", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    expect(await rateLimit("k", 5, 60_000)).toBe(true);
  });
});

describe("getClientIp", () => {
  it("取 x-forwarded-for 最左 IP", () => {
    const req = new NextRequest("http://localhost/api", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("無標頭時回傳 unknown", () => {
    const req = new NextRequest("http://localhost/api");
    expect(getClientIp(req)).toBe("unknown");
  });
});
