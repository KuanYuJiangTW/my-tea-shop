import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import { createPayPalOrder } from "@/lib/paypal";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const RL_KEY = (ip: string) => `paypal-retry:${ip}`;

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await rateLimit(RL_KEY(ip), 20, 60_000))) {
    return NextResponse.json({ error: "請求過於頻繁，請稍後再試。" }, { status: 429 });
  }

  // Auth
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const body = await req.json();
  const orderId = body.orderId as string;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  // Find order and verify ownership
  // customer_name / shipping_address 是給 PayPal 帶收件地址用的（見下方組裝處）
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, user_id, payment_status, order_status, total_amount, payment_method, customer_name, shipping_address")
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

  if (order.payment_method !== "paypal") {
    return NextResponse.json({ error: "This order is not a PayPal order" }, { status: 400 });
  }

  // Create new PayPal Order (no points/coupon deduction — already done)
  //
  // 重新付款必須重現首次結帳的脈絡，否則國際客人走這條路會少掉東西：
  // 不帶地址 → PayPal 要他自己再挑一次（且可能挑到與我們出貨依據不同的地址）；
  // returnUrl 不帶 intl=1 → 成功頁不顯示關稅與不可退貨須知，違反 order-result 規格。
  const shipping = order.shipping_address as {
    type?: string; country?: string; state?: string; city?: string;
    addressLine1?: string; addressLine2?: string; postalCode?: string;
  } | null;
  const isInternational = shipping?.type === "international";

  const reqOrigin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/order.*/, "") || "";
  const base = reqOrigin || process.env.NEXT_PUBLIC_BASE_URL || ALLOWED_ORIGIN;
  const locale = body.locale === "en" ? "/en" : "";
  const intlParam = isInternational ? "&intl=1" : "";
  const returnUrl = `${base}${locale}/order/result?paypal=success${intlParam}`;
  const cancelUrl = `${base}${locale}/order/result?paypal=cancel&orderId=${order.id}`;

  try {
    const paypalShipping = isInternational && shipping
      ? {
          fullName: order.customer_name,
          addressLine1: shipping.addressLine1 ?? "",
          addressLine2: shipping.addressLine2 || undefined,
          city: shipping.city ?? "",
          state: shipping.state ?? "",
          postalCode: shipping.postalCode ?? "",
          countryCode: shipping.country ?? "",
        }
      : undefined;

    const { paypalOrderId, approveUrl } = await createPayPalOrder(
      order.total_amount, order.id, returnUrl, cancelUrl, paypalShipping,
    );

    // Update PayPal Order ID
    await supabase.from("orders").update({ paypal_order_id: paypalOrderId }).eq("id", order.id);

    return NextResponse.json({ url: approveUrl });
  } catch (err) {
    console.error("PayPal retry failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
