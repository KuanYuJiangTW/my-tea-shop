import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { resolveCouponCode } from "@/lib/coupons";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const limiter = createRateLimiter(10, 60_000); // 10 次/分鐘

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (limiter.isLimited(ip)) {
    return NextResponse.json({ error: "操作太頻繁，請稍後再試" }, { status: 429 });
  }
  limiter.record(ip);

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ valid: false, error: "請輸入折價碼" }, { status: 400 });

  const result = await resolveCouponCode(user.id, code.trim());
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    id: result.coupon.id,
    discount_amount: result.coupon.discount_amount,
    min_order_amount: result.coupon.min_order_amount,
    type: result.coupon.type,
  });
}
