import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import { createPayPalOrder } from "@/lib/paypal";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { CreateOrderRequest } from "@/types";
import { calculateShippingFee } from "@/lib/shipping";
import { validateRedemption, deductPoints, refundPoints } from "@/lib/points";
import { resolveCouponCode, recordCouponUsage } from "@/lib/coupons";
import { isValidCvs } from "@/lib/cvs";
import { splitOrderItems, validateBundleItems, type ValidatedBundleItem } from "@/lib/order-bundles";

const RL_KEY = (ip: string) => `paypal-create:${ip}`;

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
  name: 100, phone: 30, city: 50, address: 200, note: 500, storeName: 100,
};

const PAYPAL_MIN_AMOUNT = 32;

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req);
  if (!(await rateLimit(RL_KEY(ip), 20, 60_000))) {
    return NextResponse.json({ error: "請求過於頻繁，請稍後再試。" }, { status: 429 });
  }

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
  if (body.deliveryType !== "home" && body.deliveryType !== "cvs" && body.deliveryType !== "international") {
    return NextResponse.json({ error: "Invalid delivery type" }, { status: 400 });
  }
  if (body.deliveryType === "cvs" && body.cvsInfo?.company && !isValidCvs(body.cvsInfo.company)) {
    return NextResponse.json({ error: "Invalid CVS type" }, { status: 400 });
  }
  // International address validation
  if (body.deliveryType === "international") {
    const ia = body.internationalAddress;
    if (!ia?.country || !ia?.state || !ia?.city || !ia?.addressLine1 || !ia?.postalCode) {
      return NextResponse.json({ error: "International address is incomplete" }, { status: 400 });
    }
  }
  if (body.customer.name.length > MAX_LENGTHS.name) return NextResponse.json({ error: "Name too long" }, { status: 400 });
  if (body.customer.phone.length > MAX_LENGTHS.phone) return NextResponse.json({ error: "Phone too long" }, { status: 400 });
  if (body.shippingAddress?.city && body.shippingAddress.city.length > MAX_LENGTHS.city) return NextResponse.json({ error: "City too long" }, { status: 400 });
  if (body.shippingAddress?.address && body.shippingAddress.address.length > MAX_LENGTHS.address) return NextResponse.json({ error: "Address too long" }, { status: 400 });
  if (body.cvsInfo?.storeName && body.cvsInfo.storeName.length > MAX_LENGTHS.storeName) return NextResponse.json({ error: "Store name too long" }, { status: 400 });
  if (body.note && body.note.length > MAX_LENGTHS.note) return NextResponse.json({ error: "Note too long" }, { status: 400 });

  // ── 1. Server-side price lookup ──────────────────────────────────────────
  // 組合品項先分流：單品照既有迴圈走，組合交給 order-bundles 的共用邏輯
  const { productItems, bundleItems: bundleReqs } = splitOrderItems(body.items);
  const productIds = productItems.map(i => i.productId);
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

  for (const reqItem of productItems) {
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

  // ── 驗證組合品項 ────────────────────────────────────────────────────────
  // 單價一律取 product_bundles.price，不由成分售價加總推導——組合的定價是
  // 獨立決策（650 vs 單買 700），加總會讓折扣憑空消失
  const bundleResult = await validateBundleItems(bundleReqs);
  if (!bundleResult.ok) {
    return NextResponse.json({ error: bundleResult.error }, { status: 400 });
  }
  const validatedBundles: ValidatedBundleItem[] = bundleResult.items;
  const subtotal = validatedItems.reduce((sum, i) => sum + i.subtotal, 0) +
    validatedBundles.reduce((sum, b) => sum + b.subtotal, 0);
  let shippingFeeResult;
  try {
    shippingFeeResult = await calculateShippingFee({
      deliveryType: body.deliveryType,
      subtotal,
      countryCode: body.internationalAddress?.country,
      items: body.deliveryType === "international" ? validatedItems.map(i => ({ spec: i.spec, quantity: i.quantity })) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const shippingFee = shippingFeeResult.fee;

  // ── 4. Auth ──────────────────────────────────────────────────────────────
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const userId = user.id;
  const verifiedEmail = user.email?.trim() || body.customer.email?.trim();
  if (!verifiedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // ── 5. Coupon validation (batch + universal) ─────────────────────────────
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

  // ── 6. Points validation (新制 1:1) ──────────────────────────────────────
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

  // ── 7. Total & minimum ───────────────────────────────────────────────────
  const totalAmount = Math.max(subtotal + shippingFee - couponDiscount - pointsDiscount, 0);

  if (totalAmount < PAYPAL_MIN_AMOUNT) {
    return NextResponse.json({ error: `PayPal minimum payment amount is NT$${PAYPAL_MIN_AMOUNT}` }, { status: 400 });
  }

  // ── 8. Create pending order ──────────────────────────────────────────────
  let shippingAddress;
  if (body.deliveryType === "international") {
    const ia = body.internationalAddress!;
    shippingAddress = {
      type: "international",
      country: ia.country,
      countryName: ia.countryName,
      state: ia.state,
      city: ia.city,
      addressLine1: ia.addressLine1,
      addressLine2: ia.addressLine2 || undefined,
      postalCode: ia.postalCode,
    };
  } else if (body.deliveryType === "home") {
    shippingAddress = { type: "home", city: body.shippingAddress?.city, address: body.shippingAddress?.address };
  } else {
    shippingAddress = { type: "cvs", company: body.cvsInfo?.company, storeId: body.cvsInfo?.storeId, storeName: body.cvsInfo?.storeName };
  }

  const { data: orderData, error: dbError } = await supabase.from("orders").insert({
    customer_name: body.customer.name,
    customer_email: verifiedEmail,
    customer_phone: body.customer.phone,
    payment_method: "paypal",
    shipping_address: shippingAddress,
    items: [...validatedItems, ...validatedBundles],
    shipping_fee: shippingFee,
    total_amount: totalAmount,
    order_status: "new",
    payment_status: "pending",
    note: body.note ?? null,
    user_id: userId,
    subtotal,
    coupon_id: couponId,
    discount_amount: couponDiscount + pointsDiscount,
    coupon_discount: couponDiscount,
    points_discount: pointsDiscount,
    points_used: pointsUsed,
  }).select("id").single();

  if (dbError || !orderData) {
    console.error("Failed to create order:", JSON.stringify(dbError, null, 2));
    return NextResponse.json({ error: `Failed to create order: ${dbError?.message ?? "unknown"}` }, { status: 500 });
  }

  // ── 9. Deduct coupon & points ────────────────────────────────────────────
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

  // ── 10. Create PayPal Order ──────────────────────────────────────────────
  const reqOrigin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/checkout.*/, "") || "";
  const base = reqOrigin || process.env.NEXT_PUBLIC_BASE_URL || ALLOWED_ORIGIN;
  const localePath = body.locale === "en" ? "/en" : "";
  const intlParam = body.deliveryType === "international" ? "&intl=1" : "";
  const returnUrl = `${base}${localePath}/order/result?paypal=success${intlParam}`;
  const cancelUrl = `${base}${localePath}/order/result?paypal=cancel&orderId=${orderData.id}`;

  try {
    const paypalShipping = body.deliveryType === "international" && body.internationalAddress
      ? {
          fullName: body.customer.name,
          addressLine1: body.internationalAddress.addressLine1,
          addressLine2: body.internationalAddress.addressLine2 || undefined,
          city: body.internationalAddress.city,
          state: body.internationalAddress.state,
          postalCode: body.internationalAddress.postalCode,
          countryCode: body.internationalAddress.country,
        }
      : undefined;

    const { paypalOrderId, approveUrl } = await createPayPalOrder(
      totalAmount, orderData.id, returnUrl, cancelUrl, paypalShipping,
    );

    // Store PayPal Order ID
    await supabase.from("orders").update({ paypal_order_id: paypalOrderId }).eq("id", orderData.id);

    return NextResponse.json({ url: approveUrl, orderId: orderData.id });
  } catch (err) {
    console.error("PayPal create order failed, rolling back:", err instanceof Error ? err.message : err);

    // Rollback: mark order as failed
    await supabase.from("orders").update({ order_status: "failed" }).eq("id", orderData.id);

    // Rollback coupon
    if (couponId && couponType === "batch") {
      await supabase.from("coupons").update({ used_at: null, order_id: null }).eq("id", couponId);
    } else if (couponId && couponType === "universal") {
      await supabase.from("coupon_usages").delete().eq("template_id", couponId).eq("user_id", userId).eq("order_id", orderData.id);
    }

    // Rollback points
    if (pointsUsed > 0) {
      await refundPoints({
        userId,
        points: pointsUsed,
        orderId: orderData.id,
        description: "PayPal 建立失敗退還點數",
      });
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `PayPal payment failed: ${message}` }, { status: 500 });
  }
}
