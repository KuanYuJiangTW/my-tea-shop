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

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

type ProductRow = {
  id:              number;
  name:            string;
  price:           number;
  price_75g:       number | null;
  price_tea_bag:   number | null;
  stock_quantity:  number | null;
  stock_75g:       number | null;
  stock_tea_bag:   number | null;
};

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  if (origin && origin !== ALLOWED_ORIGIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as EcpayCheckoutRequest;

  // ── 1. 後端查詢真實價格，完全不信任前端傳來的金額 ──────────────────────
  const productIds = body.items.map(i => i.productId);
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, price, price_75g, price_tea_bag, stock_quantity, stock_75g, stock_tea_bag")
    .in("id", productIds) as { data: ProductRow[] | null; error: unknown };

  if (productError || !products) {
    return NextResponse.json({ error: "查詢商品失敗" }, { status: 500 });
  }

  // ── 2. 驗證每筆商品：存在、數量合法、庫存充足 ───────────────────────────
  type ValidatedItem = { productId: number; name: string; quantity: number; unitPrice: number; subtotal: number };
  const validatedItems: ValidatedItem[] = [];

  for (const reqItem of body.items) {
    const product = products.find(p => p.id === reqItem.productId);
    if (!product) {
      return NextResponse.json({ error: `商品不存在：${reqItem.productId}` }, { status: 400 });
    }

    const qty = reqItem.quantity;
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: "數量必須為正整數" }, { status: 400 });
    }

    const spec = reqItem.spec ?? "150g";
    let unitPrice: number;
    let stock: number | null;

    if (spec === "75g") {
      if (!product.price_75g) return NextResponse.json({ error: `商品無 75g 規格：${product.name}` }, { status: 400 });
      unitPrice = product.price_75g;
      stock = product.stock_75g;
    } else if (spec === "teabag") {
      if (!product.price_tea_bag) return NextResponse.json({ error: `商品無茶包規格：${product.name}` }, { status: 400 });
      unitPrice = product.price_tea_bag;
      stock = product.stock_tea_bag;
    } else {
      unitPrice = product.price;
      stock = product.stock_quantity;
    }

    if (stock !== null && stock < qty) {
      return NextResponse.json({ error: `庫存不足：${product.name}` }, { status: 400 });
    }

    validatedItems.push({ productId: product.id, name: product.name, quantity: qty, unitPrice, subtotal: unitPrice * qty });
  }

  // ── 3. 後端計算運費 ──────────────────────────────────────────────────────
  const subtotal    = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const shippingFee = subtotal >= 1000 ? 0 : body.deliveryType === "home" ? 250 : 60;

  // ── 4. 驗證 token ────────────────────────────────────────────────────────
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
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const userId = user.id;
  const verifiedEmail = user.email!;

  // ── 5. 折價券驗證 ────────────────────────────────────────────────────────
  let couponId: string | null = null;
  let couponDiscount = 0;

  if (body.couponCode) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("id, discount_amount, min_order_amount")
      .eq("user_id", userId)
      .eq("code", body.couponCode)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!coupon) {
      return NextResponse.json({ error: "折價券無效或已使用" }, { status: 400 });
    }
    if (subtotal + shippingFee < coupon.min_order_amount) {
      return NextResponse.json({ error: `未達折價券最低消費 NT$${coupon.min_order_amount}` }, { status: 400 });
    }
    couponId = coupon.id;
    couponDiscount = coupon.discount_amount;
  }

  // ── 6. 點數折抵驗證 ──────────────────────────────────────────────────────
  let pointsUsed = 0;
  let pointsDiscount = 0;
  const pointsToUse = body.pointsToUse ?? 0;

  if (pointsToUse > 0) {
    if (pointsToUse < 200 || pointsToUse % 100 !== 0) {
      return NextResponse.json({ error: "點數最少 200 點，且須為 100 的倍數" }, { status: 400 });
    }
    const { data: txs } = await supabase
      .from("point_transactions")
      .select("points")
      .eq("user_id", userId);
    const balance = (txs ?? []).reduce((s: number, t: { points: number }) => s + t.points, 0);
    if (balance < pointsToUse) {
      return NextResponse.json({ error: "點數不足" }, { status: 400 });
    }
    const afterCoupon = subtotal + shippingFee - couponDiscount;
    const maxDiscount = Math.floor(afterCoupon * 0.1);
    if (pointsToUse / 100 > maxDiscount) {
      return NextResponse.json({ error: `點數折抵上限為 NT$${maxDiscount}` }, { status: 400 });
    }
    pointsUsed = pointsToUse;
    pointsDiscount = pointsToUse / 100;
  }

  // ── 7. 計算最終金額 ──────────────────────────────────────────────────────
  const totalAmount = Math.max(subtotal + shippingFee - couponDiscount - pointsDiscount, 0);

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.nextUrl.host}`;

  const pad  = (n: number) => String(n).padStart(2, "0");
  const now  = new Date();
  const date = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
               `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const tradeNo  = `T${Date.now()}`.slice(0, 20);
  const itemName = validatedItems.map(i => `${i.name} x${i.quantity}`).join("#").slice(0, 200);

  // 建立 pending 訂單
  const shippingAddress =
    body.deliveryType === "home"
      ? { type: "home", city: body.shippingAddress?.city, address: body.shippingAddress?.address }
      : { type: "cvs",  company: body.cvsInfo?.company,   storeName: body.cvsInfo?.storeName };

  const { data: orderData, error: dbError } = await supabase.from("orders").insert({
    customer_name:    body.customer.name,
    customer_email:   verifiedEmail,
    customer_phone:   body.customer.phone,
    payment_method:   "online",
    shipping_address: shippingAddress,
    items:            validatedItems,
    shipping_fee:     shippingFee,
    total_amount:     totalAmount,
    order_status:     "new",
    payment_status:   "pending",
    ecpay_trade_no:   tradeNo,
    note:             body.note ?? null,
    user_id:          userId,
    coupon_id:        couponId,
    discount_amount:  couponDiscount + pointsDiscount,
    points_used:      pointsUsed,
  }).select("id").single();

  if (dbError) {
    console.error("建立訂單失敗:", dbError);
  } else if (orderData) {
    if (couponId) {
      await supabase.from("coupons").update({ used_at: new Date().toISOString(), order_id: orderData.id }).eq("id", couponId);
    }
    if (pointsUsed > 0) {
      await supabase.from("point_transactions").insert({
        user_id: userId, points: -pointsUsed, type: "redeem",
        order_id: orderData.id, description: `訂單折抵 NT$${pointsDiscount}`,
      });
    }
    await supabase.from("point_transactions").insert({
      user_id: userId, points: subtotal, type: "earn",
      order_id: orderData.id, description: "訂單消費回饋",
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

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
    TotalAmount:       String(Math.round(totalAmount)),
    TradeDesc:         "WuJueTea",
  };

  params.CheckMacValue = buildCheckMacValue(params);

  return NextResponse.json(
    { ecpayUrl: ECPAY_URL, params } satisfies EcpayCheckoutResponse,
    {
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

// preflight
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
