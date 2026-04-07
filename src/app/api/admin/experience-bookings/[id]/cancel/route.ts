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
  const hoursUntil  = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysUntil   = Math.ceil(hoursUntil / 24); // 僅用於回傳顯示

  let refundRate = 0;
  if (hoursUntil >= 7 * 24)      refundRate = 1.0; // 7 天以上
  else if (hoursUntil >= 3 * 24) refundRate = 0.5; // 3–6 天
  else if (hoursUntil >= 24)     refundRate = 0.2; // 1–2 天
  // < 24 小時 → refundRate 維持 0

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
