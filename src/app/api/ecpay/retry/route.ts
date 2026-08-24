import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import { ECPAY_CHECKOUT_URL , ECPAY_MERCHANT_ID, ECPAY_HASH_KEY, ECPAY_HASH_IV } from "@/lib/ecpay-env";

const MERCHANT = ECPAY_MERCHANT_ID;
const HASH_KEY = ECPAY_HASH_KEY;
const HASH_IV = ECPAY_HASH_IV;

const ECPAY_URL = ECPAY_CHECKOUT_URL;

function phpUrlencode(input: string): string {
  const SAFE = /^[A-Za-z0-9\-_.]$/;
  let out = "";
  for (const char of input) {
    if (char === " ")        out += "+";
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

export async function POST(req: NextRequest) {
  // Auth
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await req.json();
  const orderId = body.orderId as string;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  // Find order and verify ownership
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, user_id, payment_status, order_status, payment_method, total_amount, items")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.payment_status === "paid") {
    return NextResponse.json({ error: "訂單已完成付款" }, { status: 400 });
  }

  if (order.order_status === "cancelled" || order.order_status === "failed") {
    return NextResponse.json({ error: "此訂單無法重新付款" }, { status: 400 });
  }

  if (order.payment_method !== "online") {
    return NextResponse.json({ error: "此訂單不是線上付款" }, { status: 400 });
  }

  // Generate new trade number
  const pad  = (n: number) => String(n).padStart(2, "0");
  const now  = new Date();
  const date = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
               `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const tradeNo = `T${Date.now()}`.slice(0, 20);
  const orderItems = order.items as { name: string; quantity: number }[];
  const itemName = orderItems.map(i => `${i.name} x${i.quantity}`).join("#").slice(0, 200);

  // Update trade number on the order
  await supabase.from("orders").update({ ecpay_trade_no: tradeNo }).eq("id", order.id);

  const base =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://taiwantea.store";

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
    TotalAmount:       String(Math.round(order.total_amount)),
    TradeDesc:         "WuJueTea",
  };

  params.CheckMacValue = buildCheckMacValue(params);

  return NextResponse.json({ ecpayUrl: ECPAY_URL, params });
}
