import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkIntRange, checkText, firstError, MAX_TEXT_LEN } from "@/lib/validate";

// POST /api/reviews
// body: { bookingId, rating, comment? }
export async function POST(req: NextRequest) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { bookingId, rating, comment } = await req.json();

  if (!bookingId) {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }
  // rating 需為 1~5 的整數（原本只檢查數值範圍，3.7 這種會通過）；
  // comment 需為字串且有長度上限（原本未檢型別，送數字會讓 .trim() 丟 500）
  const err = firstError(
    checkIntRange(rating, "評分", 1, 5, true),
    checkText(comment, "評論內容", { max: MAX_TEXT_LEN }),
  );
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  // 查詢預約，確認是本人、已確認、體驗日期已過
  const { data: booking, error: fetchError } = await supabase
    .from("experience_bookings")
    .select(`
      id, user_id, status,
      session:experience_sessions(session_date, experience_type_id)
    `)
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  }

  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return NextResponse.json({ error: "只有已確認或已完成的預約可以留評" }, { status: 409 });
  }

  const session = booking.session as unknown as { session_date: string; experience_type_id: number } | null;
  // completed 狀態由管理員確認已完成，不需再檢查日期
  if (!session) {
    return NextResponse.json({ error: "找不到場次資料" }, { status: 404 });
  }
  if (booking.status === "confirmed" && new Date(session.session_date) >= new Date()) {
    return NextResponse.json({ error: "體驗尚未結束，無法留評" }, { status: 409 });
  }

  const { data: review, error: insertError } = await supabase
    .from("experience_reviews")
    .insert({
      booking_id:         bookingId,
      user_id:            user.id,
      experience_type_id: session.experience_type_id,
      rating,
      comment:            comment?.trim() || null,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "您已經評價過這筆預約" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ id: review.id });
}
