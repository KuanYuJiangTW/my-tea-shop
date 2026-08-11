import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { supabase as adminSupabase } from "@/lib/supabase";
import { WELCOME_COUPON } from "@/lib/coupon-constants";

function genCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "WEL-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // OAuth / Magic Link 登入後跳轉目的地（只允許站內路徑）
  const next = searchParams.get("next");

  const redirectPath = next && next.startsWith("/") ? next : "/account";
  const response = NextResponse.redirect(`${origin}${redirectPath}`);

  if (code) {
    // 關鍵：supabase client 的 setAll 同時寫入 request 與 response
    // 這樣 session cookie 才會隨著 redirect response 一起帶回瀏覽器
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
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
      // 金額／門檻／效期一律取 WELCOME_COUPON——公告條與註冊頁對外宣傳的是同一組值
      const expires = new Date();
      expires.setDate(expires.getDate() + WELCOME_COUPON.expiryDays);
      await adminSupabase.from("coupons").insert({
        user_id:          data.user.id,
        code:             genCouponCode(),
        source:           "welcome",
        discount_amount:  WELCOME_COUPON.discountAmount,
        min_order_amount: WELCOME_COUPON.minOrderAmount,
        expires_at:       expires.toISOString(),
      });
    }
  }

  return response;
}
