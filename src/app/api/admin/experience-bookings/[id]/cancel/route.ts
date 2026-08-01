import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { notifyNextWaitlist } from "@/lib/waitlist";
import { refundBookingPoints } from "@/lib/points";
import { withAdminAuth } from "@/lib/admin-auth-guard";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/experience-bookings/[id]/cancel
export const POST = withAdminAuth(async (_req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;

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
  const wasPending = booking.status === "pending_payment";
  let refundAmount = 0;
  let refundRate   = 0;
  let daysUntil    = 0;

  if (!wasPending) {
    const sessionDate = new Date(`${booking.session.session_date}T${booking.session.start_time}`);
    const hoursUntil  = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    daysUntil = Math.ceil(hoursUntil / 24);

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

  // 退還已折抵的點數。退還量以 point_transactions 為準（見 refundBookingPoints），
  // 不看 booking.points_used / points_discount——舊制那兩欄與帳本差 100 倍。
  // 待付款：尚未成行，全額退還；已確認：按退款比例退還
  if (booking.user_id) {
    await refundBookingPoints({
      userId: booking.user_id,
      bookingId: id,
      refundRate: wasPending ? 1 : refundRate,
    });
  }

  // 通知候補者（僅已確認的預約才有佔名額，待付款不需通知）
  if (!wasPending) {
    notifyNextWaitlist(booking.session_id, booking.participant_count).catch(console.error);
  }

  return NextResponse.json({ refundAmount, daysUntil });
}, "cancel_booking");
