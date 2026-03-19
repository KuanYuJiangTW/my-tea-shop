import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import type { EcpayCheckoutRequest, EcpayCheckoutResponse } from "@/types";

const MERCHANT  = process.env.ECPAY_MERCHANT_ID!;
const HASH_KEY  = process.env.ECPAY_HASH_KEY!;
const HASH_IV   = process.env.ECPAY_HASH_IV!;
const ECPAY_URL = "https://payment.ecpay.com.tw/Cashier/AioCheckout/index";

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
  const body = await req.json() as EcpayCheckoutRequest;

  // 取得當前登入的 user_id（若有登入）
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  const userId = user?.id ?? null;

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.nextUrl.host}`;

  const pad  = (n: number) => String(n).padStart(2, "0");
  const now  = new Date();
  const date = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
               `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const tradeNo  = `T${Date.now()}`.slice(0, 20);
  const itemName = body.items.map(i => `${i.name} x${i.quantity}`).join("#").slice(0, 200);

  // 建立 pending 訂單
  const shippingAddress =
    body.deliveryType === "home"
      ? { type: "home", city: body.shippingAddress?.city, address: body.shippingAddress?.address }
      : { type: "cvs",  company: body.cvsInfo?.company,   storeName: body.cvsInfo?.storeName };

  const items = body.items.map((i) => ({
    productId: i.productId,
    name:      i.name,
    quantity:  i.quantity,
    unitPrice: i.unitPrice,
    subtotal:  i.unitPrice * i.quantity,
  }));

  const { error: dbError } = await supabase.from("orders").insert({
    customer_name:    body.customer.name,
    customer_email:   body.customer.email,
    customer_phone:   body.customer.phone,
    payment_method:   "online",
    shipping_address: shippingAddress,
    items,
    shipping_fee:     body.shippingFee,
    total_amount:     body.totalAmount,
    order_status:     "new",
    payment_status:   "pending",
    ecpay_trade_no:   tradeNo,
    note:             body.note ?? null,
    user_id:          userId,
  });

  if (dbError) console.error("建立訂單失敗:", dbError);

  const params: Record<string, string> = {
    ChoosePayment:     "Credit",
    EncryptType:       "1",
    ItemName:          itemName,
    MerchantID:        MERCHANT,
    MerchantTradeDate: date,
    MerchantTradeNo:   tradeNo,
    OrderResultURL:    `${base}/api/ecpay/result`,
    PaymentType:       "aio",
    ReturnURL:         `${base}/api/ecpay/return`,
    TotalAmount:       String(Math.round(body.totalAmount)),
    TradeDesc:         "WuJueTea",
  };

  params.CheckMacValue = buildCheckMacValue(params);

  return NextResponse.json({ ecpayUrl: ECPAY_URL, params } satisfies EcpayCheckoutResponse);
}
