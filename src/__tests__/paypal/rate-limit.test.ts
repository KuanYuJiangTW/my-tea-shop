import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

// ═════════════════════════════════════════════════════════════════════════════
// 7.9 驗證 rate limiting 生效
// ═════════════════════════════════════════════════════════════════════════════

describe("createRateLimiter", () => {
  it("should limit after max requests reached", () => {
    const limiter = createRateLimiter(3, 60_000);

    limiter.record("1.2.3.4");
    limiter.record("1.2.3.4");
    limiter.record("1.2.3.4");

    expect(limiter.isLimited("1.2.3.4")).toBe(true);
  });

  it("should track different IPs independently", () => {
    const limiter = createRateLimiter(2, 60_000);

    limiter.record("1.1.1.1");
    limiter.record("1.1.1.1");

    expect(limiter.isLimited("1.1.1.1")).toBe(true);
    expect(limiter.isLimited("2.2.2.2")).toBe(false);
  });

  it("should allow requests after window expires", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(2, 1000);

    limiter.record("1.1.1.1");
    limiter.record("1.1.1.1");
    expect(limiter.isLimited("1.1.1.1")).toBe(true);

    vi.advanceTimersByTime(1001);
    expect(limiter.isLimited("1.1.1.1")).toBe(false);

    vi.useRealTimers();
  });

  it("should not limit when count is below max", () => {
    const limiter = createRateLimiter(5, 60_000);

    limiter.record("1.1.1.1");
    limiter.record("1.1.1.1");
    limiter.record("1.1.1.1");

    expect(limiter.isLimited("1.1.1.1")).toBe(false);
  });

  it("should reset count after window expires", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(2, 500);

    limiter.record("1.1.1.1");
    limiter.record("1.1.1.1");
    expect(limiter.isLimited("1.1.1.1")).toBe(true);

    vi.advanceTimersByTime(501);

    limiter.record("1.1.1.1");
    expect(limiter.isLimited("1.1.1.1")).toBe(false);

    vi.useRealTimers();
  });

  it("should return false for first-time IP", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.isLimited("new-ip")).toBe(false);
  });

  it("should simulate PayPal endpoint rate limit (20 req/60s)", () => {
    const limiter = createRateLimiter(20, 60_000);

    for (let i = 0; i < 20; i++) {
      expect(limiter.isLimited("attacker")).toBe(false);
      limiter.record("attacker");
    }

    expect(limiter.isLimited("attacker")).toBe(true);
    // 其他 IP 不受影響
    expect(limiter.isLimited("legitimate")).toBe(false);
  });
});

describe("getClientIp", () => {
  it("should extract first IP from x-forwarded-for header", () => {
    const req = new NextRequest("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18" },
    });
    expect(getClientIp(req)).toBe("203.0.113.50");
  });

  it("should return 'unknown' when no forwarded header", () => {
    const req = new NextRequest("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("should trim whitespace from IP", () => {
    const req = new NextRequest("https://example.com", {
      headers: { "x-forwarded-for": "  10.0.0.1 , 20.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });
});
