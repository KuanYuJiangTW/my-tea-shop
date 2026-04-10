import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// POST — 驗證 TOTP 碼後停用 2FA（清除 secret）
export const POST = withAdminAuth(async (req: NextRequest) => {
  const { code } = await req.json() as { code?: string };

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "請輸入 6 位驗證碼" }, { status: 400 });
  }

  // 取得現有 TOTP secret
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "totp_secret")
    .maybeSingle();

  if (!data?.value) {
    return NextResponse.json({ error: "2FA 尚未設定" }, { status: 400 });
  }

  const isValid = authenticator.verify({ token: code, secret: data.value });
  if (!isValid) {
    return NextResponse.json({ error: "驗證碼錯誤，請重試" }, { status: 400 });
  }

  // 清除 TOTP secret
  const { error } = await supabase
    .from("admin_settings")
    .delete()
    .eq("key", "totp_secret");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}, "disable_2fa");
