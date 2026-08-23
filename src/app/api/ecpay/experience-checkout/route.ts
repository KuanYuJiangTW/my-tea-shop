import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { validateRedemption, deductPoints } from "@/lib/points";
import { ECPAY_CHECKOUT_URL } from "@/lib/ecpay-env";

const MERCHANT  = process.env.ECPAY_MERCHANT_ID!;
const HASH_KEY  = process.env.ECPAY_HASH_KEY!;
const HASH_IV   = process.env.ECPAY_HASH_IV!;
const ECPAY_URL = ECPAY_CHECKOUT_URL;

function phpUrlencode(input: string): string {
  const SAFE = /^[A-Za-z0-9\-_.]$/;
  let out = "";
  for (const char of input) {
    if (char === " ")         out += "+";
    else if (SAFE.test(char)) out += char;
    else                      out += encodeURIComponent(char);
  }
  return out;
}

function buildCheckMacValue(params: Record<string, string>): string {
  const chain = Object.keys(params)
    .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
    .map(k => `${k}=${params[k]}`)
    .join("&");
  const raw     = `HashKey=${HASH_KEY}&${chain}&HashIV=${HASH_IV}`;
  const encoded = phpUrlencode(raw).toLowerCase();
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

// POST /api/ecpay/experience-checkout
// body: { bookingId: string }
export async function POST(req: NextRequest) {
  // 驗證登入
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await req.json();
  const { bookingId, pointsToUse = 0 } = body as { bookingId?: string; pointsToUse?: number };
  if (!bookingId) return NextResponse.json({ error: "缺少 bookingId" }, { status: 400 });

  // 查詢預約資料
  const { data: booking, error } = await supabase
    .from("experience_bookings")
    .select("*, session:experience_sessions(session_date, start_time, experience_types(name))")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .eq("status", "pending_payment")
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "找不到此預約或狀態不符" }, { status: 404 });
  }

  // ── 點數折抵驗證（新制 1:1）────────────────────────────────────────────────
  let pointsUsed = 0;
  let pointsDiscount = 0;

  // 冪等性：同一筆預約可能被重複結帳（重整、從綠界返回上一頁、換付款方式）。
  // 帳本已有 redeem 就沿用既有折抵，不再扣一次——否則多扣的點數在取消時退不回來。
  const { count: redeemCount } = await supabase
    .from("point_transactions")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("type", "redeem");
  const alreadyDeducted = (redeemCount ?? 0) > 0;

  if (alreadyDeducted) {
    pointsUsed = booking.points_used ?? 0;
    pointsDiscount = booking.points_discount ?? 0;
  } else if (pointsToUse > 0) {
    const redemption = await validateRedemption(user.id, pointsToUse, booking.total_price);
    if (!redemption.valid) {
      return NextResponse.json({ error: redemption.error }, { status: 400 });
    }
    pointsUsed = redemption.pointsUsed;
    pointsDiscount = redemption.pointsDiscount; // 1:1
  }

  const actualAmount = Math.max(booking.total_price - pointsDiscount, 0);

  // 更新 booking 的點數記錄
  if (!alreadyDeducted && pointsUsed > 0) {
    await supabase
      .from("experience_bookings")
      .update({ points_used: pointsUsed, points_discount: pointsDiscount })
      .eq("id", bookingId);

    await deductPoints({
      userId: user.id,
      points: pointsUsed,
      bookingId,
      description: `體驗預約折抵 NT$${pointsDiscount}`,
    });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.nextUrl.host}`;

  const pad  = (n: number) => String(n).padStart(2, "0");
  const now  = new Date();
  const date = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
               `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // B 前綴區別一般訂單（T 前綴）
  const tradeNo  = `B${Date.now()}`.slice(0, 20);
  const expName  = booking.session?.experience_types?.name ?? "茶藝體驗";
  const itemName = `${expName} x${booking.participant_count}人`.slice(0, 200);

  // 儲存 tradeNo 到 booking
  await supabase
    .from("experience_bookings")
    .update({ ecpay_trade_no: tradeNo })
    .eq("id", bookingId);

  const params: Record<string, string> = {
    ChoosePayment:     "ALL",
    EncryptType:       "1",
    ItemName:          itemName,
    MerchantID:        MERCHANT,
    MerchantTradeDate: date,
    MerchantTradeNo:   tradeNo,
    OrderResultURL:    `${base}/api/ecpay/result`,
    PaymentType:       "aio",
    ReturnURL:         `${base}/api/ecpay/return`,
    TotalAmount:       String(actualAmount),
    TradeDesc:         "WuJueTea-Experience",
  };

  params.CheckMacValue = buildCheckMacValue(params);

  return NextResponse.json({ ecpayUrl: ECPAY_URL, params });
}
