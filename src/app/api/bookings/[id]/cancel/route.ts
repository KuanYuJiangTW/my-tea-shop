import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

// POST /api/bookings/[id]/cancel — 取消預約
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { data: booking, error: fetchError } = await supabase
    .from("experience_bookings")
    .select("*, session:experience_sessions(session_date, start_time)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  }

  if (booking.status !== "confirmed" && booking.status !== "pending_payment") {
    return NextResponse.json({ error: "此預約無法取消" }, { status: 409 });
  }

  // 待付款的預約尚未付款，直接取消不退款
  const sessionDate = new Date(`${booking.session.session_date}T${booking.session.start_time}`);
  const now         = new Date();
  const daysUntil   = Math.ceil((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let refundRate = 0;
  if (booking.status === "confirmed") {
    if (daysUntil >= 7)      refundRate = 1.0;
    else if (daysUntil >= 3) refundRate = 0.5;
    else if (daysUntil >= 1) refundRate = 0.2;
  }

  const refundAmount = Math.floor(booking.total_price * refundRate);

  const { error: updateError } = await supabase
    .from("experience_bookings")
    .update({
      status:              "cancelled",
      cancelled_at:        now.toISOString(),
      cancellation_reason: "客人取消",
      refund_amount:       refundAmount,
      refund_status:       refundAmount > 0 ? "pending" : "none",
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ refundAmount, daysUntil });
}
