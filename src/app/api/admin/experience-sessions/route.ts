import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// GET /api/admin/experience-sessions — 近期 90 天場次
export const GET = withAdminAuth(async () => {
  const today = new Date().toISOString().split("T")[0];
  const end   = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("experience_sessions")
    .select("*, experience_types(name, slug)")
    .gte("session_date", today)
    .lte("session_date", end)
    .order("session_date")
    .order("start_time");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

// POST /api/admin/experience-sessions — 新增場次
export const POST = withAdminAuth(async (req: NextRequest) => {
  const { experienceTypeId, date, time } = await req.json();

  if (!experienceTypeId || !date || !time) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("experience_sessions")
    .insert({
      experience_type_id: experienceTypeId,
      session_date:       date,
      start_time:         time,
    })
    .select()
    .single();

  if (error) {
    // unique constraint 衝突
    if (error.code === "23505") {
      return NextResponse.json({ error: "此時段已存在相同體驗場次" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
});
