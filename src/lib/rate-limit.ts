import { NextRequest } from "next/server";

type RateLimitRecord = { count: number; resetAt: number };

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const map = new Map<string, RateLimitRecord>();

  function isLimited(ip: string): boolean {
    const now = Date.now();
    const r = map.get(ip);
    if (!r) return false;
    if (r.resetAt <= now) { map.delete(ip); return false; }
    return r.count >= maxRequests;
  }

  function record(ip: string): void {
    const now = Date.now();
    const r = map.get(ip);
    if (r && r.resetAt > now) r.count += 1;
    else map.set(ip, { count: 1, resetAt: now + windowMs });
  }

  return { isLimited, record };
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}
