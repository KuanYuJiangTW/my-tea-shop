import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { sendOrderEmails } from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { calculateShippingFee } from "@/lib/shipping";
import { validateRedemption, deductPoints } from "@/lib/points";
import { isValidCvs, cvsSupportsCod } from "@/lib/cvs";
import { resolveCouponCode, recordCouponUsage } from "@/lib/coupons";

const RL_KEY = (ip: string) => `orders:${ip}`; // 20 req/min per IP
import type { CreateOrderRequest } from "@/types";

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
  if (!(await rateLimit(RL_KEY(ip), 20, 60_000))) {
    return NextResponse.json({ error: "請求過於頻繁，請稍後再試。" }, { status: 429 });
  }

  const body = await req.json() as CreateOrderRequest;

  // ── 0. 基本格式驗證 ──────────────────────────────────────────────────────
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "購物車不能為空" }, { status: 400 });
  }
  if (!body.customer?.name?.trim() || !body.customer?.phone?.trim()) {
    return NextResponse.json({ error: "請填寫完整的客戶資訊" }, { status: 400 });
  }
  if (body.paymentMethod !== "online" && body.paymentMethod !== "cod") {
    return NextResponse.json({ error: "無效的付款方式" }, { status: 400 });
  }
  if (body.deliveryType !== "home" && body.deliveryType !== "cvs") {
    return NextResponse.json({ error: "無效的配送方式" }, { status: 400 });
  }
  if (body.deliveryType === "cvs" && body.cvsInfo?.company && !isValidCvs(body.cvsInfo.company)) {
    return NextResponse.json({ error: "無效的超商類型" }, { status: 400 });
  }
  // 貨到付款只能搭配可代收貨款的超商（清單見 lib/cvs.ts）
  if (body.paymentMethod === "cod" && body.deliveryType === "cvs"
      && body.cvsInfo?.company && !cvsSupportsCod(body.cvsInfo.company)) {
    return NextResponse.json({ error: "此超商不支援貨到付款，請改選其他超商" }, { status: 400 });
  }
  // 長度限制
  if (body.customer.name.length > MAX_LENGTHS.name)       return NextResponse.json({ error: "姓名過長" },   { status: 400 });
  if (body.customer.phone.length > MAX_LENGTHS.phone)      return NextResponse.json({ error: "電話過長" },   { status: 400 });
  if (body.shippingAddress?.city    && body.shippingAddress.city.length    > MAX_LENGTHS.city)    return NextResponse.json({ error: "縣市過長" },   { status: 400 });
  if (body.shippingAddress?.address && body.shippingAddress.address.length > MAX_LENGTHS.address) return NextResponse.json({ error: "地址過長" },   { status: 400 });
  if (body.cvsInfo?.storeName       && body.cvsInfo.storeName.length       > MAX_LENGTHS.storeName) return NextResponse.json({ error: "門市名稱過長" }, { status: 400 });
  if (body.note && body.note.length > MAX_LENGTHS.note)   return NextResponse.json({ error: "備註過長" },   { status: 400 });

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
  type ValidatedItem = { productId: number; name: string; quantity: number; unitPrice: number; subtotal: number; spec: string };
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
  const subtotal    = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const { fee: shippingFee } = await calculateShippingFee({ deliveryType: body.deliveryType, subtotal });

  // ── 4. 驗證 token，未登入直接拒絕 ──────────────────────────────────────
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
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
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

  // ── 6. 點數折抵驗證（新制 1:1）───────────────────────────────────────────
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

  const shippingAddress =
    body.deliveryType === "home"
      ? { type: "home", city: body.shippingAddress?.city, address: body.shippingAddress?.address }
      : { type: "cvs",  company: body.cvsInfo?.company,   storeId: body.cvsInfo?.storeId, storeName: body.cvsInfo?.storeName };

  // ── 8. 原子性扣除庫存（訂單建立前，防止競態條件超賣）────────────────────
  const decrementResults = await Promise.all(
    validatedItems.map((item) =>
      supabase.rpc("decrement_stock", { p_id: item.productId, qty: item.quantity, spec: item.spec })
    )
  );
  /**
   * 回補已經扣掉的庫存。
   *
   * 扣減是 `Promise.all` 平行送出的，所以任一項失敗時，**其餘的可能已經扣成功**。
   * 這條路徑是「先扣庫存、再建訂單」（為了防超賣，方向正確），但只要中途失敗
   * 又不回補，就會留下「庫存被扣掉但訂單不存在」的狀態——庫存憑空蒸發。
   *
   * 只補 `data === true` 的那幾項：失敗的那項根本沒扣成功，補了會無中生有。
   *
   * 對照組：三條線上金流路徑（ecpay/return、stripe/webhook、paypal capture）
   * 是**付款成功後**才扣，那時已無法回滾付款，所以它們的做法是標記
   * `order_status = "stock_issue"` 交人工處理——那是對的，不要照搬這裡的回補。
   */
  const rollbackStock = () =>
    Promise.all(
      validatedItems
        .filter((_, i) => decrementResults[i]?.data === true)
        .map((item) =>
          supabase.rpc("increment_stock", { p_id: item.productId, qty: item.quantity, spec: item.spec })
        )
    );

  const failedIdx = decrementResults.findIndex((r) => r.data === false || r.error);
  if (failedIdx !== -1) {
    await rollbackStock();
    return NextResponse.json({ error: `庫存不足：${validatedItems[failedIdx].name}，請減少數量或選擇其他商品` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name:    body.customer.name,
      customer_email:   verifiedEmail,
      customer_phone:   body.customer.phone,
      payment_method:   body.paymentMethod,
      shipping_address: shippingAddress,
      items:            validatedItems,
      subtotal,
      shipping_fee:     shippingFee,
      total_amount:     totalAmount,
      order_status:     "new",
      payment_status:   "pending",
      note:             body.note ?? null,
      user_id:          userId,
      coupon_id:        couponId,
      discount_amount:  couponDiscount + pointsDiscount,
      coupon_discount:  couponDiscount,
      points_discount:  pointsDiscount,
      points_used:      pointsUsed,
    })
    .select("id")
    .single();

  if (error) {
    // 庫存已扣但訂單沒建成——不補就是憑空蒸發
    await rollbackStock();
    console.error("建立訂單失敗:", error);
    return NextResponse.json({ error: "建立訂單失敗" }, { status: 500 });
  }

  // 標記折價券已使用。批次券寫回 coupons，通用碼記一筆 coupon_usages
  //（取消訂單時的還原以 coupon_usages.order_id 為鍵，見 orders/[id]/cancel）
  if (couponId && couponType === "batch") {
    await supabase.from("coupons").update({ used_at: new Date().toISOString(), order_id: data.id }).eq("id", couponId);
  } else if (couponId && couponType === "universal") {
    await recordCouponUsage({ templateId: couponId, userId, orderId: data.id });
  }

  // 若使用點數折抵，立即扣除（防止重複使用）
  if (pointsUsed > 0) {
    await deductPoints({
      userId,
      points: pointsUsed,
      orderId: data.id,
      description: `訂單折抵 NT$${pointsDiscount}`,
    });
  }
  // 注意：點數累積（earn）在管理後台確認完成後才發放

  // 寄送訂單確認信（只寄給已驗證的帳號 email，避免被拿來騷擾任意信箱）
  if (!user.email) {
    return NextResponse.json({ orderId: data.id });
  }
  await sendOrderEmails({
    orderId:         data.id,
    customerName:    body.customer.name,
    customerEmail:   verifiedEmail,
    paymentMethod:   body.paymentMethod,
    shippingAddress: shippingAddress as Parameters<typeof sendOrderEmails>[0]["shippingAddress"],
    items:           validatedItems,
    shippingFee,
    totalAmount,
    note:            body.note,
  });

  return NextResponse.json({ orderId: data.id });
}
