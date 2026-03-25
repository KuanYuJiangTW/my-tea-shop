import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabase as adminSupabase } from "@/lib/supabase";

function genCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "WEL-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // OAuth / Magic Link 登入後跳轉目的地（只允許站內路徑）
  const next = searchParams.get("next");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // 確保 profile 存在（第一次登入時建立）
      await supabase.from("profiles").upsert(
        { id: data.user.id, name: data.user.user_metadata?.name ?? null },
        { onConflict: "id", ignoreDuplicates: true }
      );

      // 新用戶發送歡迎折價券（unique index 確保每人只發一次，重複時自動忽略）
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await adminSupabase.from("coupons").insert({
        user_id:          data.user.id,
        code:             genCouponCode(),
        source:           "welcome",
        discount_amount:  50,
        min_order_amount: 350,
        expires_at:       expires.toISOString(),
      });
    }
  }

  const redirectPath = next && next.startsWith("/") ? next : "/account";
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
