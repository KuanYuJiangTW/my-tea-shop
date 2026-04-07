import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// POST /api/waitlist
// body: { sessionId, participantCount, bookerName, bookerPhone, dietaryNotes?, adultConfirmed? }
export async function POST(req: NextRequest) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, participantCount, bookerName, bookerPhone, dietaryNotes, adultConfirmed } = body;

  if (!sessionId || !participantCount || !bookerName || !bookerPhone) {
    return NextResponse.json({ error: "請填寫所有必填欄位" }, { status: 400 });
  }

  // 確認場次存在且為 full（額滿才允許候補）
  const { data: session } = await supabase
    .from("experience_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "找不到此場次" }, { status: 404 });
  }
  if (session.status !== "full") {
    return NextResponse.json({ error: "此場次仍有名額，請直接預約" }, { status: 409 });
  }

  // 取得使用者 email
  const { data: profile } = await supabaseUser
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const bookerEmail = user.email ?? "";

  const { data: entry, error } = await supabase
    .from("waitlist_entries")
    .insert({
      session_id:        sessionId,
      user_id:           user.id,
      booker_name:       bookerName.trim(),
      booker_phone:      bookerPhone.trim(),
      booker_email:      bookerEmail,
      participant_count: participantCount,
      dietary_notes:     dietaryNotes?.trim() || null,
      adult_confirmed:   adultConfirmed ?? false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 更新場次的候補人數
  await supabase.rpc("increment_waitlist_count", { session_id_arg: sessionId });

  // 使用 profile 避免 unused variable warning
  void profile;

  return NextResponse.json({ waitlistId: entry.id });
}
