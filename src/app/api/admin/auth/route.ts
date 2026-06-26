import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateAdminSessionToken, createAdminSession, deleteAdminSession } from "@/lib/admin-token";
import { supabase } from "@/lib/supabase";
import { getClientIp, rateLimitPeek, rateLimitBump, rateLimitReset } from "@/lib/rate-limit";

// ─── 持久化防爆破（只計失敗次數，Supabase rate_limits 表）─────────────────────
// 改用 DB 計數，解決 Vercel serverless 多 instance 下記憶體限流失效的問題。
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000; // 15 分鐘
const DELAY_MS   = 800;         // 失敗後延遲回應，增加暴力破解成本
const RL_KEY = (ip: string) => `admin-auth:${ip}`;

// ─── POST /api/admin/auth ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (await rateLimitPeek(RL_KEY(ip), MAX_ATTEMPTS)) {
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
    await rateLimitBump(RL_KEY(ip), WINDOW_MS);
    // 固定延遲回應，讓暴力破解更耗時
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await rateLimitReset(RL_KEY(ip));

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

  // 2FA 未啟用：直接發放隨機 DB-backed session
  const token = generateAdminSessionToken();
  await createAdminSession(token, ip);
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

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (token) await deleteAdminSession(token);

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
