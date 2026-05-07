import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import { createPayPalOrder } from "@/lib/paypal";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import type { CreateOrderRequest } from "@/types";

const limiter = createRateLimiter(20, 60_000);

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";
const DEV_ORIGIN = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "";

type ProductRow = {
  id: number;
  name: string;
  name_en: string | null;
  price: number;
  price_75g: number | null;
  price_tea_bag: number | null;
  stock_quantity: number | null;
  stock_75g: number | null;
  stock_tea_bag: number | null;
};

const MAX_LENGTHS = {
  name: 100, phone: 20, city: 50, address: 200, note: 500, storeName: 100,
};

const PAYPAL_MIN_AMOUNT = 32;

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  if (limiter.isLimited(ip)) {
    return NextResponse.json({ error: "請求過於頻繁，請稍後再試。" }, { status: 429 });
  }
  limiter.record(ip);

  // PayPal configured?
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
  }

  const origin = req.headers.get("origin") ?? "";
  if (origin && origin !== ALLOWED_ORIGIN && origin !== DEV_ORIGIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as CreateOrderRequest & { locale?: string };

  // ── 0. Basic validation ──────────────────────────────────────────────────
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
  if (body.customer.name.length > MAX_LENGTHS.name) return NextResponse.json({ error: "Name too long" }, { status: 400 });
  if (body.customer.phone.length > MAX_LENGTHS.phone) return NextResponse.json({ error: "Phone too long" }, { status: 400 });
  if (body.shippingAddress?.city && body.shippingAddress.city.length > MAX_LENGTHS.city) return NextResponse.json({ error: "City too long" }, { status: 400 });
  if (body.shippingAddress?.address && body.shippingAddress.address.length > MAX_LENGTHS.address) return NextResponse.json({ error: "Address too long" }, { status: 400 });
  if (body.cvsInfo?.storeName && body.cvsInfo.storeName.length > MAX_LENGTHS.storeName) return NextResponse.json({ error: "Store name too long" }, { status: 400 });
  if (body.note && body.note.length > MAX_LENGTHS.note) return NextResponse.json({ error: "Note too long" }, { status: 400 });

  // ── 1. Server-side price lookup ──────────────────────────────────────────
  const productIds = body.items.map(i => i.productId);
  let products: ProductRow[] | null = null;

  const { data: productsData, error: productError } = await supabase
    .from("products")
    .select("id, name, name_en, price, price_75g, price_tea_bag, stock_quantity, stock_75g, stock_tea_bag")
    .in("id", productIds) as { data: ProductRow[] | null; error: unknown };

  if (productError || !productsData) {
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

  // ── 2. Validate each item ────────────────────────────────────────────────
  type ValidatedItem = { productId: number; name: string; quantity: number; unitPrice: number; subtotal: number; spec: string };
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
    validatedItems.push({ productId: product.id, name: product.name, quantity: qty, unitPrice, subtotal: unitPrice * qty, spec });
  }

  // ── 3. Shipping fee ──────────────────────────────────────────────────────
  const subtotal = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const shippingFee = subtotal >= 1000 ? 0 : body.deliveryType === "home" ? 250 : 60;

  // ── 4. Auth ──────────────────────────────────────────────────────────────
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const userId = user.id;
  const verifiedEmail = user.email?.trim() || body.customer.email?.trim();
  if (!verifiedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // ── 5. Coupon validation ─────────────────────────────────────────────────
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
      return NextResponse.json({ error: "Coupon is invalid or already used" }, { status: 400 });
    }
    if (subtotal + shippingFee < coupon.min_order_amount) {
      return NextResponse.json({ error: `Minimum order NT$${coupon.min_order_amount} required` }, { status: 400 });
    }
    couponId = coupon.id;
    couponDiscount = coupon.discount_amount;
  }

  // ── 6. Points validation ─────────────────────────────────────────────────
  let pointsUsed = 0;
  let pointsDiscount = 0;
  const pointsToUse = body.pointsToUse ?? 0;

  if (pointsToUse > 0) {
    if (pointsToUse < 200 || pointsToUse % 100 !== 0) {
      return NextResponse.json({ error: "Points must be at least 200 and a multiple of 100" }, { status: 400 });
    }
    const { data: txs } = await supabase
      .from("point_transactions")
      .select("points")
      .eq("user_id", userId);
    const balance = (txs ?? []).reduce((s: number, t: { points: number }) => s + t.points, 0);
    if (balance < pointsToUse) {
      return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
    }
    const afterCoupon = subtotal + shippingFee - couponDiscount;
    const maxDiscount = Math.floor(afterCoupon * 0.1);
    if (pointsToUse / 100 > maxDiscount) {
      return NextResponse.json({ error: `Points discount capped at NT$${maxDiscount}` }, { status: 400 });
    }
    pointsUsed = pointsToUse;
    pointsDiscount = pointsToUse / 100;
  }

  // ── 7. Total & minimum ───────────────────────────────────────────────────
  const totalAmount = Math.max(subtotal + shippingFee - couponDiscount - pointsDiscount, 0);

  if (totalAmount < PAYPAL_MIN_AMOUNT) {
    return NextResponse.json({ error: `PayPal minimum payment amount is NT$${PAYPAL_MIN_AMOUNT}` }, { status: 400 });
  }

  // ── 8. Create pending order ──────────────────────────────────────────────
  const shippingAddress =
    body.deliveryType === "home"
      ? { type: "home", city: body.shippingAddress?.city, address: body.shippingAddress?.address }
      : { type: "cvs", company: body.cvsInfo?.company, storeId: body.cvsInfo?.storeId, storeName: body.cvsInfo?.storeName };

  const { data: orderData, error: dbError } = await supabase.from("orders").insert({
    customer_name: body.customer.name,
    customer_email: verifiedEmail,
    customer_phone: body.customer.phone,
    payment_method: "paypal",
    shipping_address: shippingAddress,
    items: validatedItems,
    shipping_fee: shippingFee,
    total_amount: totalAmount,
    order_status: "new",
    payment_status: "pending",
    note: body.note ?? null,
    user_id: userId,
    coupon_id: couponId,
    discount_amount: couponDiscount + pointsDiscount,
    points_used: pointsUsed,
  }).select("id").single();

  if (dbError || !orderData) {
    console.error("Failed to create order:", JSON.stringify(dbError, null, 2));
    return NextResponse.json({ error: `Failed to create order: ${dbError?.message ?? "unknown"}` }, { status: 500 });
  }

  // ── 9. Deduct coupon & points ────────────────────────────────────────────
  if (couponId) {
    await supabase.from("coupons").update({ used_at: new Date().toISOString(), order_id: orderData.id }).eq("id", couponId);
  }
  if (pointsUsed > 0) {
    await supabase.from("point_transactions").insert({
      user_id: userId, points: -pointsUsed, type: "redeem",
      order_id: orderData.id, description: `Order discount NT$${pointsDiscount}`,
    });
  }

  // ── 10. Create PayPal Order ──────────────────────────────────────────────
  const reqOrigin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/checkout.*/, "") || "";
  const base = reqOrigin || process.env.NEXT_PUBLIC_BASE_URL || ALLOWED_ORIGIN;
  const localePath = body.locale === "en" ? "/en" : "";
  const returnUrl = `${base}${localePath}/order/result?paypal=success`;
  const cancelUrl = `${base}${localePath}/order/result?paypal=cancel&orderId=${orderData.id}`;

  try {
    const { paypalOrderId, approveUrl } = await createPayPalOrder(
      totalAmount, orderData.id, returnUrl, cancelUrl,
    );

    // Store PayPal Order ID
    await supabase.from("orders").update({ paypal_order_id: paypalOrderId }).eq("id", orderData.id);

    return NextResponse.json({ url: approveUrl, orderId: orderData.id });
  } catch (err) {
    console.error("PayPal create order failed, rolling back:", err instanceof Error ? err.message : err);

    // Rollback: mark order as failed
    await supabase.from("orders").update({ order_status: "failed" }).eq("id", orderData.id);

    // Rollback coupon
    if (couponId) {
      await supabase.from("coupons").update({ used_at: null, order_id: null }).eq("id", couponId);
    }

    // Rollback points
    if (pointsUsed > 0) {
      await supabase.from("point_transactions").insert({
        user_id: userId, points: pointsUsed, type: "earn",
        order_id: orderData.id, description: "PayPal 建立失敗退還點數",
      });
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `PayPal payment failed: ${message}` }, { status: 500 });
  }
}
