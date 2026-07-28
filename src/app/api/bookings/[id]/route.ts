import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { maskParticipant } from "@/lib/pii";

type Params = { params: Promise<{ id: string }> };

// GET /api/bookings/[id] — 取得單一預約詳情
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("experience_bookings")
    .select(`
      *,
      session:experience_sessions(
        *,
        experienceType:experience_types(*)
      ),
      participants:booking_participants(*)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  }

  // 參加者個資遮罩後才回傳（身分證號、生日、緊急聯絡電話）
  const participants = Array.isArray(data.participants)
    ? data.participants.map(maskParticipant)
    : data.participants;

  return NextResponse.json({ ...data, participants });
}


