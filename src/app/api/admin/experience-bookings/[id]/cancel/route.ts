import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { notifyNextWaitlist } from "@/lib/waitlist";
import { refundPoints } from "@/lib/points";

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

  if (booking.status !== "confirmed" && booking.status !== "pending_payment") {
    return NextResponse.json({ error: "此預約無法取消" }, { status: 409 });
  }

  const now = new Date();
  let refundAmount = 0;
  let daysUntil    = 0;

  if (booking.status === "confirmed") {
    const sessionDate = new Date(`${booking.session.session_date}T${booking.session.start_time}`);
    const hoursUntil  = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    daysUntil = Math.ceil(hoursUntil / 24);

    let refundRate = 0;
    if (hoursUntil >= 7 * 24)      refundRate = 1.0;
    else if (hoursUntil >= 3 * 24) refundRate = 0.5;
    else if (hoursUntil >= 24)     refundRate = 0.2;

    const paidAmount = booking.total_price - (booking.points_discount ?? 0);
    refundAmount = Math.floor(paidAmount * refundRate);
  }

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

  // 退還已折抵的點數（新制：使用 points_discount，type='refund'）
  const wasPending = booking.status === "confirmed" ? false : true;
  const pointsDiscountUsed = booking.points_discount ?? 0;
  if (pointsDiscountUsed > 0) {
    const paidAmt = booking.total_price - pointsDiscountUsed;
    const calcRefundRate = paidAmt > 0 ? refundAmount / paidAmt : 0;
    const pointsToReturn = wasPending
      ? pointsDiscountUsed
      : Math.floor(pointsDiscountUsed * calcRefundRate);
    if (pointsToReturn > 0) {
      await refundPoints({
        userId: booking.user_id,
        points: pointsToReturn,
        bookingId: id,
        description: "體驗預約取消退還點數",
      });
    }
  }

  // 通知候補者（僅已確認的預約才有佔名額，待付款不需通知）
  if (booking.status === "confirmed") {
    notifyNextWaitlist(booking.session_id, booking.participant_count).catch(console.error);
  }

  return NextResponse.json({ refundAmount, daysUntil });
}
