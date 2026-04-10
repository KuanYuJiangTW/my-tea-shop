import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { computeAdminToken } from "@/lib/admin-token";
import { supabase } from "@/lib/supabase";

// ─── In-memory Rate Limiter ───────────────────────────────────────────────────
// 注意：Vercel serverless 在高流量下可能有多個 instance，
// 此機制在同一 instance 內有效（已足以防止一般暴力破解）
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000; // 15 分鐘
const DELAY_MS   = 800;         // 失敗後延遲回應，增加暴力破解成本

type AttemptRecord = { count: number; resetAt: number };
const attemptMap = new Map<string, AttemptRecord>();

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attemptMap.get(ip);
  if (!record) return false;
  if (record.resetAt <= now) {
    attemptMap.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const record = attemptMap.get(ip);
  if (record && record.resetAt > now) {
    record.count += 1;
  } else {
    attemptMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }
}

function clearAttempts(ip: string): void {
  attemptMap.delete(ip);
}

// ─── POST /api/admin/auth ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "太多失敗嘗試，請 15 分鐘後再試。" },
      { status: 429 }
    );
  }

  const { password } = await req.json() as { password: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Admin password not configured" }, { status: 500 });
  }

  // Timing-safe 比對：防止 timing attack
  const passwordsMatch =
    password.length === adminPassword.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword));

  if (!passwordsMatch) {
    recordFailure(ip);
    // 固定延遲回應，讓暴力破解更耗時
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  clearAttempts(ip);

  // 檢查是否已啟用 2FA
  const { data: totpData } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "totp_secret")
    .maybeSingle();

  if (totpData?.value) {
    // 2FA 已啟用：設定暫時 pending cookie，要求進行 TOTP 驗證
    const res = NextResponse.json({ require2fa: true });
    res.cookies.set("admin_pending", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 10, // 10 分鐘內完成 2FA
    });
    return res;
  }

  // 2FA 未啟用：直接發放正式 session
  const token = computeAdminToken(adminPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
