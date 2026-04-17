import { NextRequest } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { sendOrderEmails, type EmailOrderData } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig || !WEBHOOK_SECRET) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return new Response("OK", { status: 200 });
    }

    const orderId = session.metadata?.orderId;
    const tradeNo = session.metadata?.tradeNo;

    if (!orderId || !tradeNo) {
      console.error("Stripe webhook: missing metadata", session.id);
      return new Response("OK", { status: 200 });
    }

    // Update order payment status
    const { data: order, error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", orderId)
      .eq("payment_status", "pending")
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update order payment status:", error);
      return new Response("OK", { status: 200 });
    }

    if (order) {
      // Deduct stock (atomic)
      const orderItems = order.items as { productId: number; quantity: number; spec: string }[];
      const decrementResults = await Promise.all(
        orderItems.map((item) =>
          supabase.rpc("decrement_stock", { p_id: item.productId, qty: item.quantity, spec: item.spec ?? "150g" })
        )
      );
      const stockFailed = decrementResults.some((r) => r.data === false || r.error);
      if (stockFailed) {
        await supabase
          .from("orders")
          .update({ order_status: "stock_issue" })
          .eq("id", order.id);
        console.error("Stripe payment succeeded but stock deduction failed, order needs manual review:", order.id);
      }

      // Send order confirmation email
      const emailData: EmailOrderData = {
        orderId:         order.id,
        customerName:    order.customer_name,
        customerEmail:   order.customer_email,
        paymentMethod:   "online",
        shippingAddress: order.shipping_address,
        items:           order.items,
        shippingFee:     order.shipping_fee,
        totalAmount:     order.total_amount,
        note:            order.note ?? undefined,
      };
      await sendOrderEmails(emailData);
    }
  }

  return new Response("OK", { status: 200 });
}
