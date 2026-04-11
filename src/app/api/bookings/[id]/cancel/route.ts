import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendBookingCancelEmail } from "@/lib/email";
import { notifyNextWaitlist } from "@/lib/waitlist";

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
    .select(`
      *,
      session:experience_sessions(
        session_date, start_time,
        experience_types(name)
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  }

  if (booking.status !== "confirmed" && booking.status !== "pending_payment") {
    return NextResponse.json({ error: "此預約無法取消" }, { status: 409 });
  }

  const wasPending = booking.status === "pending_payment";

  // 待付款的預約尚未付款，直接取消不退款
  const sessionDate  = new Date(`${booking.session.session_date}T${booking.session.start_time}`);
  const now          = new Date();
  const hoursUntil   = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysUntil    = Math.ceil(hoursUntil / 24); // 僅用於回傳顯示

  let refundRate = 0;
  if (!wasPending) {
    if (hoursUntil >= 7 * 24)      refundRate = 1.0; // 7 天以上
    else if (hoursUntil >= 3 * 24) refundRate = 0.5; // 3–6 天
    else if (hoursUntil >= 24)     refundRate = 0.2; // 1–2 天
    // < 24 小時 → refundRate 維持 0
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

  // 退還已折抵的點數（按退款比例，待付款不退）
  if (!wasPending && booking.points_used > 0 && refundRate > 0) {
    const refundPoints = Math.floor(booking.points_used * refundRate);
    if (refundPoints > 0) {
      supabase.from("point_transactions").insert({
        user_id:     user.id,
        points:      refundPoints,
        type:        "earn",
        order_id:    id,
        description: "體驗預約取消退還點數",
      }).then(({ error }) => { if (error) console.error("[points] 退還失敗:", error.message); });
    }
  }

  // 通知候補者（fire-and-forget）
  notifyNextWaitlist(booking.session_id, booking.participant_count).catch(console.error);

  // 寄取消確認信（fire-and-forget，不影響回應）
  const expName = (booking.session?.experience_types as { name: string } | null)?.name ?? "茶藝體驗";
  sendBookingCancelEmail({
    bookerName:     booking.booker_name,
    bookerEmail:    booking.booker_email,
    experienceName: expName,
    sessionDate:    booking.session.session_date,
    startTime:      booking.session.start_time,
    refundAmount,
    wasPending,
  }).catch(console.error);

  return NextResponse.json({ refundAmount, daysUntil });
}
