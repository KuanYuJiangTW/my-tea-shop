import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/experience-sessions/[id] — 更新場次狀態
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id }    = await params;
  const { status } = await req.json();

  if (!["open", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "無效的狀態值" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("experience_sessions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
