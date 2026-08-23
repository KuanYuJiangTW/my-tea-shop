import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

/**
 * 公休／黑名單日期。
 *
 * **只擋新的開課申請，不影響既有場次與預約**——把已經有場次的日子設為公休
 * 是合理的（例如那天只接既有團），所以這裡不做任何連坐處理。
 */
const UNDEFINED_TABLE = "42P01";
const NOT_MIGRATED = NextResponse.json(
  { error: "資料表尚未建立，請先執行 supabase/add_experience_requests.sql" },
  { status: 503 },
);

export const GET = withAdminAuth(async () => {
  const { data, error } = await supabase
    .from("experience_blackout_dates")
    .select("*")
    .order("blackout_date");

  if (error) {
    return error.code === UNDEFINED_TABLE ? NOT_MIGRATED
      : NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  const { date, reason } = await req.json().catch(() => ({}));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    return NextResponse.json({ error: "日期格式不正確" }, { status: 400 });
  }
  if (reason !== undefined && reason !== null && (typeof reason !== "string" || reason.length > 200)) {
    return NextResponse.json({ error: "原因過長" }, { status: 400 });
  }

  // 該日已有場次時提示但不阻擋——業主可能就是要擋新申請、保留既有場次
  const { count } = await supabase
    .from("experience_sessions")
    .select("id", { count: "exact", head: true })
    .eq("session_date", date);

  const { error } = await supabase
    .from("experience_blackout_dates")
    .insert({ blackout_date: date, reason: reason || null });

  if (error) {
    if (error.code === UNDEFINED_TABLE) return NOT_MIGRATED;
    if (error.code === "23505") return NextResponse.json({ error: "這天已經在公休清單裡了" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, existingSessions: count ?? 0 });
}, "add_blackout_date");

export const DELETE = withAdminAuth(async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const { error } = await supabase.from("experience_blackout_dates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}, "remove_blackout_date");
