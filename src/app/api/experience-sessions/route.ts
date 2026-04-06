import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/experience-sessions?slug=tea-ceremony&year=2026&month=5
// 取得特定體驗類型某月份的所有場次
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug  = searchParams.get("slug");
  const year  = searchParams.get("year");
  const month = searchParams.get("month");

  if (!slug || !year || !month) {
    return NextResponse.json(
      { error: "需要提供 slug、year、month 參數" },
      { status: 400 }
    );
  }

  // 取得體驗類型 id
  const { data: expType, error: typeError } = await supabase
    .from("experience_types")
    .select("id, min_participants, max_participants")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (typeError || !expType) {
    return NextResponse.json({ error: "找不到此體驗類型" }, { status: 404 });
  }

  // 查詢該月份所有場次
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate   = new Date(Number(year), Number(month), 0)
    .toISOString()
    .split("T")[0]; // 該月最後一天

  const { data: sessions, error } = await supabase
    .from("experience_sessions")
    .select("*")
    .eq("experience_type_id", expType.id)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .order("session_date")
    .order("start_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = sessions.map((s) => ({
    id:                  s.id,
    experienceTypeId:    s.experience_type_id,
    sessionDate:         s.session_date,
    startTime:           s.start_time,
    status:              s.status,
    currentParticipants: s.current_participants,
    maxParticipants:     expType.max_participants,
    minParticipants:     expType.min_participants,
    availableSpots:      expType.max_participants - s.current_participants,
    cancelReason:        s.cancel_reason ?? undefined,
  }));

  return NextResponse.json(result);
}
