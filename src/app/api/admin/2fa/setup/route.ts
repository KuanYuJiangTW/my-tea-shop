import { NextRequest, NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import { verifyTotp } from "@/lib/totp";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// GET — 生成新 TOTP secret 與 QR Code（尚未儲存，需使用者確認後 POST）
export const GET = withAdminAuth(async () => {
  const secret = generateSecret();
  const otpauth = generateURI({ strategy: "totp", label: "admin", issuer: "霧抉茶後台", secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  return NextResponse.json({ secret, qrDataUrl });
});

// POST — 使用者掃描後輸入驗證碼確認，通過後儲存 secret
export const POST = withAdminAuth(async (req: NextRequest) => {
  const { secret, code } = await req.json() as { secret?: string; code?: string };

  if (!secret || !code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const valid = await verifyTotp(code, secret);
  if (!valid) {
    return NextResponse.json({ error: "驗證碼錯誤，請重試" }, { status: 400 });
  }

  // 儲存 TOTP secret
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key: "totp_secret", value: secret });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
