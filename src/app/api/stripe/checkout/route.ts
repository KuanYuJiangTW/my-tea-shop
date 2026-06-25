import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";
import type { CreateOrderRequest } from "@/types";
import { calculateShippingFee } from "@/lib/shipping";
import { validateRedemption, deductPoints } from "@/lib/points";
import { resolveCouponCode, recordCouponUsage } from "@/lib/coupons";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const RL_KEY = (ip: string) => `stripe-checkout:${ip}`;

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

type ProductRow = {
  id:              number;
  name:            string;
  name_en:         string | null;
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

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const origin = req.headers.get("origin") ?? "";
  if (origin && origin !== ALLOWED_ORIGIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as CreateOrderRequest & { locale?: string };

  // ── 0. Basic validation ────────────────────────────────────────────────────
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (!body.customer?.name?.trim() || !body.customer?.phone?.trim()) {
    return NextResponse.json({ error: "Please fill in customer info" }, { status: 400 });
  }
  if (body.deliveryType !== "home" && body.deliveryType !== "cvs") {
    return NextResponse.json({ error: "Invalid delivery type" }, { status: 400 });
  }
  const VALID_CVS = ["seven", "family", "hilife", "ok"];
  if (body.deliveryType === "cvs" && body.cvsInfo?.company && !VALID_CVS.includes(body.cvsInfo.company)) {
    return NextResponse.json({ error: "Invalid CVS type" }, { status: 400 });
  }
  if (body.customer.name.length > MAX_LENGTHS.name)       return NextResponse.json({ error: "Name too long" },    { status: 400 });
  if (body.customer.phone.length > MAX_LENGTHS.phone)      return NextResponse.json({ error: "Phone too long" },   { status: 400 });
  if (body.shippingAddress?.city    && body.shippingAddress.city.length    > MAX_LENGTHS.city)    return NextResponse.json({ error: "City too long" },    { status: 400 });
  if (body.shippingAddress?.address && body.shippingAddress.address.length > MAX_LENGTHS.address) return NextResponse.json({ error: "Address too long" }, { status: 400 });
  if (body.cvsInfo?.storeName       && body.cvsInfo.storeName.length       > MAX_LENGTHS.storeName) return NextResponse.json({ error: "Store name too long" }, { status: 400 });
  if (body.note && body.note.length > MAX_LENGTHS.note)   return NextResponse.json({ error: "Note too long" },    { status: 400 });

  // ── 1. Server-side price lookup ────────────────────────────────────────────
  const productIds = body.items.map(i => i.productId);

  // Try with name_en first, fallback without it
  let products: ProductRow[] | null = null;
  const { data: productsData, error: productError } = await supabase
    .from("products")
    .select("id, name, name_en, price, price_75g, price_tea_bag, stock_quantity, stock_75g, stock_tea_bag")
    .in("id", productIds) as { data: ProductRow[] | null; error: unknown };

  if (productError || !productsData) {
    // Fallback: query without name_en
    const { data: fallback, error: fallbackError } = await supabase
      .from("products")
      .select("id, name, price, price_75g, price_tea_bag, stock_quantity, stock_75g, stock_tea_bag")
      .in("id", productIds) as { data: Omit<ProductRow, "name_en">[] | null; error: unknown };

    if (fallbackError || !fallback) {
      return NextResponse.json({ error: "Failed to query products" }, { status: 500 });
    }
    products = fallback.map(p => ({ ...p, name_en: null }));
  } else {
    products = productsData;
  }

  // ── 2. Validate each item ──────────────────────────────────────────────────
  type ValidatedItem = { productId: number; name: string; nameEn: string; quantity: number; unitPrice: number; subtotal: number; spec: string };
  const validatedItems: ValidatedItem[] = [];

  for (const reqItem of body.items) {
    const product = products.find(p => p.id === reqItem.productId);
    if (!product) {
      return NextResponse.json({ error: `Product not found: ${reqItem.productId}` }, { status: 400 });
    }

    const qty = reqItem.quantity;
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: "Quantity must be a positive integer" }, { status: 400 });
    }

    const spec = reqItem.spec ?? "150g";
    if (spec !== "150g" && spec !== "75g" && spec !== "teabag") {
      return NextResponse.json({ error: `Invalid spec: ${spec}` }, { status: 400 });
    }
    let unitPrice: number;
    let stock: number | null;

    if (spec === "75g") {
      if (!product.price_75g) return NextResponse.json({ error: `No 75g spec: ${product.name}` }, { status: 400 });
      unitPrice = product.price_75g;
      stock = product.stock_75g;
    } else if (spec === "teabag") {
      if (!product.price_tea_bag) return NextResponse.json({ error: `No tea bag spec: ${product.name}` }, { status: 400 });
      unitPrice = product.price_tea_bag;
      stock = product.stock_tea_bag;
    } else {
      unitPrice = product.price;
      stock = product.stock_quantity;
    }

    if (stock !== null && stock < qty) {
      return NextResponse.json({ error: `Insufficient stock: ${product.name}` }, { status: 400 });
    }

    validatedItems.push({ productId: product.id, name: product.name, nameEn: product.name_en ?? product.name, quantity: qty, unitPrice, subtotal: unitPrice * qty, spec });
  }

  // ── 3. Shipping fee ────────────────────────────────────────────────────────
  const subtotal    = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const { fee: shippingFee } = await calculateShippingFee({ deliveryType: body.deliveryType, subtotal });

  // ── 4. Auth ────────────────────────────────────────────────────────────────
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
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const userId = user.id;
  const verifiedEmail = user.email?.trim() || body.customer.email?.trim();
  if (!verifiedEmail) {
    return NextResponse.json({ error: "Email is required for order notifications" }, { status: 400 });
  }

  // ── 5. Coupon validation (batch + universal) ────────────────────────────────
  let couponId: string | null = null;
  let couponDiscount = 0;
  let couponType: "batch" | "universal" | null = null;

  if (body.couponCode) {
    const couponResult = await resolveCouponCode(userId, body.couponCode);
    if (!couponResult.valid) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }
    if (subtotal + shippingFee < couponResult.coupon.min_order_amount) {
      return NextResponse.json({ error: `Minimum order NT$${couponResult.coupon.min_order_amount} required` }, { status: 400 });
    }
    couponId = couponResult.coupon.id;
    couponDiscount = couponResult.coupon.discount_amount;
    couponType = couponResult.coupon.type;
  }

  // ── 6. Points validation (新制 1:1) ─────────────────────────────────────────
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

  // ── 7. Total ───────────────────────────────────────────────────────────────
  const totalAmount = Math.max(subtotal + shippingFee - couponDiscount - pointsDiscount, 0);

  const tradeNo = `S${Date.now()}`.slice(0, 20);

  // ── 8. Create pending order ────────────────────────────────────────────────
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
    items:            validatedItems.map(({ nameEn, ...rest }) => rest),
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

  if (dbError || !orderData) {
    console.error("Failed to create order:", dbError);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

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
      description: `Order discount NT$${pointsDiscount}`,
    });
  }

  // ── 9. Create Stripe Checkout Session ──────────────────────────────────────
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? ALLOWED_ORIGIN;

  const specLabel = (spec: string) => spec === "75g" ? "75g" : spec === "teabag" ? "Tea Bags" : "150g";

  // Stripe TWD: unit_amount is in cents (1/100), so multiply by 100
  const toStripeAmount = (ntd: number) => Math.round(ntd * 100);

  const lineItems = validatedItems.map(item => ({
    price_data: {
      currency: "twd",
      product_data: {
        name: `${item.nameEn || item.name} (${specLabel(item.spec)})`,
      },
      unit_amount: toStripeAmount(item.unitPrice),
    },
    quantity: item.quantity,
  }));

  if (shippingFee > 0) {
    lineItems.push({
      price_data: {
        currency: "twd",
        product_data: { name: body.deliveryType === "home" ? "Shipping (Home Delivery)" : "Shipping (CVS Pickup)" },
        unit_amount: toStripeAmount(shippingFee),
      },
      quantity: 1,
    });
  }

  // Stripe minimum: ~US$0.50 ≈ NT$16
  if (totalAmount < 16) {
    return NextResponse.json({ error: "Stripe 最低付款金額為 NT$16" }, { status: 400 });
  }

  const discounts: { coupon: string }[] = [];
  const totalDiscount = couponDiscount + pointsDiscount;

  if (totalDiscount > 0) {
    const stripeCoupon = await stripe.coupons.create({
      amount_off: toStripeAmount(totalDiscount),
      currency: "twd",
      duration: "once",
      name: "Discount",
    });
    discounts.push({ coupon: stripeCoupon.id });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      ...(discounts.length > 0 ? { discounts } : {}),
      metadata: {
        orderId: orderData.id,
        tradeNo,
      },
      success_url: `${base}${body.locale === "en" ? "/en" : ""}/order/result?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${base}${body.locale === "en" ? "/en" : ""}/order/result?stripe=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe session creation failed:", message);
    return NextResponse.json({ error: `Failed to create payment session: ${message}` }, { status: 500 });
  }
}
