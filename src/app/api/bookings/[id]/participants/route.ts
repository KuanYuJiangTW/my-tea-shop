import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

// GET /api/bookings/[id]/participants — 取得參加者列表
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  // 確認預約屬於此用戶
  const { data: booking } = await supabase
    .from("experience_bookings")
    .select("id, participant_count, participants_due_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  }

  const { data: participants, error } = await supabase
    .from("booking_participants")
    .select("*")
    .eq("booking_id", id)
    .order("is_primary", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    participants,
    total:      booking.participant_count,
    filled:     participants.length,
    remaining:  booking.participant_count - participants.length,
    dueAt:      booking.participants_due_at,
  });
}

// POST /api/bookings/[id]/participants — 新增參加者資料
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { data: booking } = await supabase
    .from("experience_bookings")
    .select("id, participant_count, participants_due_at, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "找不到此預約" }, { status: 404 });
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json({ error: "此預約狀態不允許填寫參加者資料" }, { status: 409 });
  }

  // 檢查截止日
  if (booking.participants_due_at && new Date() > new Date(booking.participants_due_at)) {
    return NextResponse.json({ error: "參加者資料補填已截止" }, { status: 410 });
  }

  // 檢查是否已達人數上限
  const { count } = await supabase
    .from("booking_participants")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", id);

  if ((count ?? 0) >= booking.participant_count) {
    return NextResponse.json({ error: "參加者資料已填寫完畢" }, { status: 409 });
  }

  const body = await req.json();
  const { name, idNumber, dateOfBirth, emergencyContactName, emergencyContactPhone, isPrimary } = body;

  if (!name || !idNumber || !dateOfBirth || !emergencyContactName || !emergencyContactPhone) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const { data: participant, error } = await supabase
    .from("booking_participants")
    .insert({
      booking_id:              id,
      is_primary:              isPrimary ?? false,
      name,
      id_number:               idNumber,
      date_of_birth:           dateOfBirth,
      emergency_contact_name:  emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(participant, { status: 201 });
}
