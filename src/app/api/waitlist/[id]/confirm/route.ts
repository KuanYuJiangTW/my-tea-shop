import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

// POST /api/waitlist/[id]/confirm
// 候補者確認參加 → 建立正式預約，導向付款
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  // 查詢候補記錄
  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select(`
      id, session_id, user_id, booker_name, booker_phone, booker_email,
      participant_count, dietary_notes, adult_confirmed, status, confirm_deadline
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!entry) {
    return NextResponse.json({ error: "找不到此候補記錄" }, { status: 404 });
  }

  if (entry.status !== "notified") {
    return NextResponse.json({ error: "此候補記錄目前無法確認" }, { status: 409 });
  }

  if (new Date(entry.confirm_deadline) < new Date()) {
    return NextResponse.json({ error: "確認時間已過期，名額已釋出" }, { status: 409 });
  }

  // 查詢場次確認仍有名額
  const { data: session } = await supabase
    .from("experience_sessions")
    .select("id, current_participants, experience_types(max_participants, price, name)")
    .eq("id", entry.session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "找不到場次" }, { status: 404 });
  }

  const expType = session.experience_types as unknown as { max_participants: number; price: number; name: string } | null;
  const available = (expType?.max_participants ?? 0) - session.current_participants;

  if (available < entry.participant_count) {
    // 名額不足，標記為 expired，通知下一位
    await supabase
      .from("waitlist_entries")
      .update({ status: "expired" })
      .eq("id", id);

    const { notifyNextWaitlist } = await import("@/lib/waitlist");
    notifyNextWaitlist(entry.session_id, entry.participant_count).catch(console.error);

    return NextResponse.json({ error: "抱歉，名額已被他人搶先，我們將通知下一位候補者" }, { status: 409 });
  }

  const totalPrice = (expType?.price ?? 0) * entry.participant_count;

  // 建立正式預約
  const { data: booking, error: bookingError } = await supabase
    .from("experience_bookings")
    .insert({
      session_id:        entry.session_id,
      user_id:           user.id,
      booker_name:       entry.booker_name,
      booker_phone:      entry.booker_phone,
      booker_email:      entry.booker_email,
      participant_count: entry.participant_count,
      total_price:       totalPrice,
      dietary_notes:     entry.dietary_notes,
      adult_confirmed:   entry.adult_confirmed,
      status:            "pending_payment",
      refund_status:     "none",
    })
    .select("id")
    .single();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  // 更新場次人數
  await supabase
    .from("experience_sessions")
    .update({
      current_participants: session.current_participants + entry.participant_count,
    })
    .eq("id", entry.session_id);

  // 標記候補為已確認，更新 waitlist_count
  await supabase
    .from("waitlist_entries")
    .update({ status: "confirmed" })
    .eq("id", id);

  await supabase.rpc("decrement_waitlist_count", { session_id_arg: entry.session_id });

  return NextResponse.json({ bookingId: booking.id });
}
