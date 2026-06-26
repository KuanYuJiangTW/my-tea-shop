import { NextRequest, NextResponse } from "next/server";
import { verify } from "otplib";
import { generateAdminSessionToken, createAdminSession } from "@/lib/admin-token";
import { supabase } from "@/lib/supabase";
import { getClientIp } from "@/lib/rate-limit";

// POST /api/admin/auth/2fa — 驗證 TOTP 碼，通過後設定正式 admin_session
export async function POST(req: NextRequest) {
  // 確認有 admin_pending cookie
  const pending = req.cookies.get("admin_pending")?.value;
  if (!pending || pending !== "1") {
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

  const isValid = await verify({ token: code, secret: data.value });
  if (!isValid) {
    return NextResponse.json({ error: "驗證碼錯誤" }, { status: 401 });
  }

  // 驗證通過：清除 pending，發放隨機 DB-backed session
  const token = generateAdminSessionToken();
  await createAdminSession(token, getClientIp(req));

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
