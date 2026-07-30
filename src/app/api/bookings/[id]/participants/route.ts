import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { validateIdNumber, maskParticipant } from "@/lib/pii";

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
    // 遮罩後才回傳：本人查看時無須再取得完整身分證號
    participants: (participants ?? []).map(maskParticipant),
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

  // ── 欄位驗證 ──────────────────────────────────────────────────────────────
  // 這些值會存進含個資的表並用於投保，亂填會造成保單無效；且原本毫無長度限制。
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 50) {
    return NextResponse.json({ error: "姓名長度不正確（1–50 字）" }, { status: 400 });
  }

  const idCheck = validateIdNumber(String(idNumber));
  if (!idCheck.ok) {
    return NextResponse.json({ error: idCheck.error }, { status: 400 });
  }

  // 生日：需為合法日期、不可為未來、年齡上限 120 歲
  const dob = new Date(String(dateOfBirth));
  if (Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: "出生日期格式不正確" }, { status: 400 });
  }
  const now = new Date();
  const oldest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
  if (dob > now || dob < oldest) {
    return NextResponse.json({ error: "出生日期不在合理範圍" }, { status: 400 });
  }

  if (typeof emergencyContactName !== "string" ||
      emergencyContactName.trim().length < 1 || emergencyContactName.trim().length > 50) {
    return NextResponse.json({ error: "緊急聯絡人姓名長度不正確（1–50 字）" }, { status: 400 });
  }

  const phone = String(emergencyContactPhone).replace(/[\s-]/g, "");
  if (!/^\+?\d{8,15}$/.test(phone)) {
    return NextResponse.json({ error: "緊急聯絡人電話格式不正確" }, { status: 400 });
  }

  const { data: participant, error } = await supabase
    .from("booking_participants")
    .insert({
      booking_id:              id,
      is_primary:              isPrimary ?? false,
      name:                    name.trim(),
      id_number:               idCheck.value,
      date_of_birth:           dateOfBirth,
      emergency_contact_name:  emergencyContactName.trim(),
      emergency_contact_phone: phone,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(maskParticipant(participant), { status: 201 });
}
