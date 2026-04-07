import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/experience-bookings/[id]/cancel
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data: booking, error: fetchError } = await supabase
    .from("experience_bookings")
    .select("*, session:experience_sessions(session_date, start_time)")
    .eq("id", id)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json({ error: "此預約無法取消" }, { status: 409 });
  }

  const sessionDate = new Date(`${booking.session.session_date}T${booking.session.start_time}`);
  const now         = new Date();
  const daysUntil   = Math.ceil((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let refundRate = 0;
  if (daysUntil >= 7)      refundRate = 1.0;
  else if (daysUntil >= 3) refundRate = 0.5;
  else if (daysUntil >= 1) refundRate = 0.2;

  const refundAmount = Math.floor(booking.total_price * refundRate);

  const { error: updateError } = await supabase
    .from("experience_bookings")
    .update({
      status:              "cancelled",
      cancelled_at:        now.toISOString(),
      cancellation_reason: "管理者代為取消",
      refund_amount:       refundAmount,
      refund_status:       refundAmount > 0 ? "pending" : "none",
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ refundAmount, daysUntil });
}
