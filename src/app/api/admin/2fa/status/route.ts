import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// GET — 回傳目前 2FA 是否已啟用
export const GET = withAdminAuth(async () => {
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "totp_secret")
    .maybeSingle();

  return NextResponse.json({ enabled: !!data?.value });
});
