import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// PATCH /api/admin/experience-bookings/[id]
// body: { refund_status?: "processed", status?: "completed" }
export const PATCH = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const body = await req.json();

  // 查詢現有預約狀態（判斷是否剛變成 completed）
  const { data: prevBooking } = await supabase
    .from("experience_bookings")
    .select("status, user_id, total_price, points_discount")
    .eq("id", id)
    .single();

  const updateData: Record<string, unknown> = {};
  if (body.refund_status !== undefined) updateData.refund_status = body.refund_status;
  if (body.status !== undefined) updateData.status = body.status;

  const { error } = await supabase
    .from("experience_bookings")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 狀態剛變成 completed → 發放積點（防重複：確認無已有 earn 記錄）
  if (
    body.status === "completed" &&
    prevBooking?.status !== "completed" &&
    prevBooking?.user_id
  ) {
    const { count } = await supabase
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", id)
      .eq("type", "earn");

    if ((count ?? 0) === 0) {
      const pointsDiscount = prevBooking.points_discount ?? 0;
      const earnPoints = Math.max(Math.floor(prevBooking.total_price - pointsDiscount), 0);
      if (earnPoints > 0) {
        await supabase.from("point_transactions").insert({
          user_id:    prevBooking.user_id,
          points:     earnPoints,
          type:       "earn",
          booking_id: id,
          description: "體驗完成回饋",
          expires_at:  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}, "update_booking");
