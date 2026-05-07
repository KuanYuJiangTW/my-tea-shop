import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import { processPayPalCapture } from "@/lib/paypal";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const limiter = createRateLimiter(20, 60_000);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (limiter.isLimited(ip)) {
    return NextResponse.json({ error: "請求過於頻繁，請稍後再試。" }, { status: 429 });
  }
  limiter.record(ip);

  // Auth
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const body = await req.json();
  const paypalOrderId = body.paypalOrderId as string;
  if (!paypalOrderId) {
    return NextResponse.json({ error: "Missing paypalOrderId" }, { status: 400 });
  }

  // Find order by paypal_order_id and verify ownership
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, user_id, payment_status, paypal_order_id")
    .eq("paypal_order_id", paypalOrderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Already paid — idempotent
  if (order.payment_status === "paid") {
    return NextResponse.json({ success: true, dbOrderId: order.id });
  }

  try {
    const result = await processPayPalCapture(order.id, paypalOrderId);
    return NextResponse.json({ success: true, dbOrderId: order.id, alreadyProcessed: result.alreadyProcessed });
  } catch (err) {
    console.error("PayPal capture failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
