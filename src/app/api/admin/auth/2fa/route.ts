import { NextRequest, NextResponse } from "next/server";
import { verifyTotp } from "@/lib/totp";
import { generateAdminSessionToken, createAdminSession } from "@/lib/admin-token";
import { verifyPendingToken } from "@/lib/admin-pending";
import { supabase } from "@/lib/supabase";
import { getClientIp, rateLimitPeek, rateLimitBump, rateLimitReset } from "@/lib/rate-limit";

// ─── 防 TOTP 窮舉（與 /api/admin/auth 同一套持久化限流）─────────────────────────
// 6 位數只有 10^6 種組合，沒有限流的話可直接暴力枚舉。
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;
const DELAY_MS = 800;
const RL_KEY = (ip: string) => `admin-2fa:${ip}`;

// POST /api/admin/auth/2fa — 驗證 TOTP 碼，通過後設定正式 admin_session
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (await rateLimitPeek(RL_KEY(ip), MAX_ATTEMPTS)) {
    return NextResponse.json(
      { error: "太多失敗嘗試，請 15 分鐘後再試。" },
      { status: 429 }
    );
  }

  // 確認持有本站簽發的 pending token（證明已通過密碼驗證）
  const pending = req.cookies.get("admin_pending")?.value;
  if (!(await verifyPendingToken(pending))) {
    return NextResponse.json({ error: "請先完成密碼驗證" }, { status: 401 });
  }

  const { code } = await req.json() as { code?: string };
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "請輸入 6 位驗證碼" }, { status: 400 });
  }

  // 從 admin_settings 取得 TOTP secret
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "totp_secret")
    .maybeSingle();

  if (!data?.value) {
    return NextResponse.json({ error: "2FA 尚未設定" }, { status: 400 });
  }

  const valid = await verifyTotp(code, data.value);
  if (!valid) {
    await rateLimitBump(RL_KEY(ip), WINDOW_MS);
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    return NextResponse.json({ error: "驗證碼錯誤" }, { status: 401 });
  }

  await rateLimitReset(RL_KEY(ip));

  // 驗證通過：清除 pending，發放隨機 DB-backed session
  const token = generateAdminSessionToken();
  await createAdminSession(token, ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_pending", "", { maxAge: 0, path: "/" });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
