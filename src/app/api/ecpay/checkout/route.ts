import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import type { EcpayCheckoutRequest, EcpayCheckoutResponse } from "@/types";
import { calculateShippingFee } from "@/lib/shipping";
import { validateRedemption, deductPoints } from "@/lib/points";
import { resolveCouponCode, recordCouponUsage } from "@/lib/coupons";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { isValidCvs } from "@/lib/cvs";
import { splitOrderItems, validateBundleItems, type ValidatedBundleItem } from "@/lib/order-bundles";
import { ECPAY_CHECKOUT_URL } from "@/lib/ecpay-env";

const MERCHANT  = process.env.ECPAY_MERCHANT_ID!;
const HASH_KEY  = process.env.ECPAY_HASH_KEY!;
const HASH_IV   = process.env.ECPAY_HASH_IV!;
const ECPAY_URL = ECPAY_CHECKOUT_URL;
const RL_KEY = (ip: string) => `ecpay-checkout:${ip}`;

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

const MAX_LENGTHS = {
  name: 100, phone: 20, city: 50, address: 200, note: 500, storeName: 100,
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await rateLimit(RL_KEY(ip), 10, 60_000))) {
    return NextResponse.json({ error: "操作太頻繁，請稍後再試" }, { status: 429 });
  }

  const origin = req.headers.get("origin") ?? "";
  if (origin && origin !== ALLOWED_ORIGIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as EcpayCheckoutRequest;

  // ── 0. 基本格式驗證 ──────────────────────────────────────────────────────
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "購物車不能為空" }, { status: 400 });
  }
  if (!body.customer?.name?.trim() || !body.customer?.phone?.trim()) {
    return NextResponse.json({ error: "請填寫完整的客戶資訊" }, { status: 400 });
  }
  if (body.deliveryType !== "home" && body.deliveryType !== "cvs") {
    return NextResponse.json({ error: "無效的配送方式" }, { status: 400 });
  }
  if (body.deliveryType === "cvs" && body.cvsInfo?.company && !isValidCvs(body.cvsInfo.company)) {
    return NextResponse.json({ error: "無效的超商類型" }, { status: 400 });
  }
  if (body.customer.name.length > MAX_LENGTHS.name)       return NextResponse.json({ error: "姓名過長" },   { status: 400 });
  if (body.customer.phone.length > MAX_LENGTHS.phone)      return NextResponse.json({ error: "電話過長" },   { status: 400 });
  if (body.shippingAddress?.city    && body.shippingAddress.city.length    > MAX_LENGTHS.city)    return NextResponse.json({ error: "縣市過長" },   { status: 400 });
  if (body.shippingAddress?.address && body.shippingAddress.address.length > MAX_LENGTHS.address) return NextResponse.json({ error: "地址過長" },   { status: 400 });
  if (body.cvsInfo?.storeName       && body.cvsInfo.storeName.length       > MAX_LENGTHS.storeName) return NextResponse.json({ error: "門市名稱過長" }, { status: 400 });
  if (body.note && body.note.length > MAX_LENGTHS.note)   return NextResponse.json({ error: "備註過長" },   { status: 400 });

  // ── 1. 後端查詢真實價格，完全不信任前端傳來的金額 ──────────────────────
  // 組合品項先分流：單品照既有迴圈走，組合交給 order-bundles 的共用邏輯
  const { productItems, bundleItems: bundleReqs } = splitOrderItems(body.items);
  const productIds = productItems.map(i => i.productId);
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, price, price_75g, price_tea_bag, stock_quantity, stock_75g, stock_tea_bag")
    .in("id", productIds) as { data: ProductRow[] | null; error: unknown };

  if (productError || !products) {
    return NextResponse.json({ error: "查詢商品失敗" }, { status: 500 });
  }

  // ── 2. 驗證每筆商品：存在、數量合法、庫存充足 ───────────────────────────
  type ValidatedItem = { productId: number; name: string; quantity: number; unitPrice: number; subtotal: number; spec: string };
  const validatedItems: ValidatedItem[] = [];

  for (const reqItem of productItems) {
    const product = products.find(p => p.id === reqItem.productId);
    if (!product) {
      return NextResponse.json({ error: `商品不存在：${reqItem.productId}` }, { status: 400 });
    }

    const qty = reqItem.quantity;
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: "數量必須為正整數" }, { status: 400 });
    }

    const spec = reqItem.spec ?? "150g";
    if (spec !== "150g" && spec !== "75g" && spec !== "teabag") {
      return NextResponse.json({ error: `無效的規格：${spec}` }, { status: 400 });
    }
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

    validatedItems.push({ productId: product.id, name: product.name, quantity: qty, unitPrice, subtotal: unitPrice * qty, spec });
  }

  // ── 3. 後端計算運費 ──────────────────────────────────────────────────────

  // ── 驗證組合品項 ────────────────────────────────────────────────────────
  // 單價一律取 product_bundles.price，不由成分售價加總推導——組合的定價是
  // 獨立決策（650 vs 單買 700），加總會讓折扣憑空消失
  const bundleResult = await validateBundleItems(bundleReqs);
  if (!bundleResult.ok) {
    return NextResponse.json({ error: bundleResult.error }, { status: 400 });
  }
  const validatedBundles: ValidatedBundleItem[] = bundleResult.items;
  const subtotal    = validatedItems.reduce((sum, i) => sum + i.subtotal, 0) +
    validatedBundles.reduce((sum, b) => sum + b.subtotal, 0);
  const { fee: shippingFee } = await calculateShippingFee({ deliveryType: body.deliveryType, subtotal });

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
  const verifiedEmail = user.email?.trim() || body.customer.email?.trim();
  if (!verifiedEmail) {
    return NextResponse.json({ error: "請填寫 Email 以接收訂單通知" }, { status: 400 });
  };

  // ── 5. 折價券驗證（支援批次券 + 通用碼）────────────────────────────────────
  let couponId: string | null = null;
  let couponDiscount = 0;
  let couponType: "batch" | "universal" | null = null;

  if (body.couponCode) {
    const couponResult = await resolveCouponCode(userId, body.couponCode);
    if (!couponResult.valid) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }
    if (subtotal + shippingFee < couponResult.coupon.min_order_amount) {
      return NextResponse.json({ error: `未達折價券最低消費 NT$${couponResult.coupon.min_order_amount}` }, { status: 400 });
    }
    couponId = couponResult.coupon.id;
    couponDiscount = couponResult.coupon.discount_amount;
    couponType = couponResult.coupon.type;
  }

  // ── 6. 點數折抵驗證（新制 1:1）──────────────────────────────────────────
  let pointsUsed = 0;
  let pointsDiscount = 0;
  const pointsToUse = body.pointsToUse ?? 0;

  if (pointsToUse > 0) {
    const afterCoupon = subtotal + shippingFee - couponDiscount;
    const redemption = await validateRedemption(userId, pointsToUse, afterCoupon);
    if (!redemption.valid) {
      return NextResponse.json({ error: redemption.error }, { status: 400 });
    }
    pointsUsed = redemption.pointsUsed;
    pointsDiscount = redemption.pointsDiscount; // 1:1
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
      : { type: "cvs",  company: body.cvsInfo?.company,   storeId: body.cvsInfo?.storeId, storeName: body.cvsInfo?.storeName };

  const { data: orderData, error: dbError } = await supabase.from("orders").insert({
    customer_name:    body.customer.name,
    customer_email:   verifiedEmail,
    customer_phone:   body.customer.phone,
    payment_method:   "online",
    shipping_address: shippingAddress,
    items:            [...validatedItems, ...validatedBundles],
    shipping_fee:     shippingFee,
    total_amount:     totalAmount,
    order_status:     "new",
    payment_status:   "pending",
    ecpay_trade_no:   tradeNo,
    note:             body.note ?? null,
    user_id:          userId,
    subtotal,
    coupon_id:        couponId,
    discount_amount:  couponDiscount + pointsDiscount,
    coupon_discount:  couponDiscount,
    points_discount:  pointsDiscount,
    points_used:      pointsUsed,
  }).select("id").single();

  if (dbError) {
    console.error("建立訂單失敗:", dbError);
  } else if (orderData) {
    if (couponId && couponType === "batch") {
      await supabase.from("coupons").update({ used_at: new Date().toISOString(), order_id: orderData.id }).eq("id", couponId);
    } else if (couponId && couponType === "universal") {
      await recordCouponUsage({ templateId: couponId, userId, orderId: orderData.id });
    }
    if (pointsUsed > 0) {
      await deductPoints({
        userId,
        points: pointsUsed,
        orderId: orderData.id,
        description: `訂單折抵 NT$${pointsDiscount}`,
      });
    }
    // 注意：點數累積（earn）在管理後台確認完成後才發放
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
