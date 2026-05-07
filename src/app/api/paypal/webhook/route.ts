import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyPayPalWebhook, processPayPalCapture } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Collect PayPal headers
  const headers: Record<string, string> = {};
  for (const key of [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ]) {
    headers[key] = req.headers.get(key) ?? "";
  }

  // Verify signature
  const verified = await verifyPayPalWebhook(headers, body);
  if (!verified) {
    console.error("PayPal webhook signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  const eventType = event.event_type as string;

  if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
    // Extract PayPal Order ID
    let paypalOrderId: string | null = null;

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      paypalOrderId = event.resource?.id;
    } else {
      // PAYMENT.CAPTURE.COMPLETED — find from supplementary_data or parent
      paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id ?? null;
    }

    if (!paypalOrderId) {
      console.error("PayPal webhook: cannot extract order ID from event", eventType);
      return new Response("OK", { status: 200 });
    }

    // Find DB order
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, paypal_order_id")
      .eq("paypal_order_id", paypalOrderId)
      .single();

    if (!order) {
      console.error("PayPal webhook: order not found for PayPal Order ID:", paypalOrderId);
      return new Response("OK", { status: 200 });
    }

    // Idempotency: already paid
    if (order.payment_status === "paid") {
      return new Response("OK", { status: 200 });
    }

    try {
      await processPayPalCapture(order.id, paypalOrderId);
    } catch (err) {
      console.error("PayPal webhook capture failed:", err);
    }
  }

  return new Response("OK", { status: 200 });
}
