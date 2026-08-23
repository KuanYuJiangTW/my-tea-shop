import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

/**
 * GET /api/experience-requests/demand?slug=&year=&month=
 *
 * 公開月曆用的「已有 N 人想在這天開課」需求標記。
 *
 * **只回聚合數字，不回任何個資**——沒有姓名、電話、Email，連是誰申請的都
 * 不知道。這是公開端點，任何人都打得到。
 *
 * **累計未滿 2 人的日期不回**：只有一個人想開課時，標記傳達的訊息是「只有
 * 你想」——那是負面社會證明，會降低而不是提高附議意願。門檻設 2 讓標記出現
 * 時永遠是正向訊號。
 */

const MIN_PEOPLE_TO_SHOW = 2;
const UNDEFINED_TABLE = "42P01";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug  = searchParams.get("slug");
  const year  = searchParams.get("year");
  const month = searchParams.get("month");

  if (!slug || !year || !month) {
    return NextResponse.json({ error: "需要提供 slug、year、month 參數" }, { status: 400 });
  }

  const { data: type } = await supabase
    .from("experience_types")
    .select("id, accepts_requests")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  // 沒開放申請的體驗不顯示需求標記——那會讓人以為可以申請
  if (!type || !type.accepts_requests) return NextResponse.json([]);

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end   = new Date(Number(year), Number(month), 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("experience_requests")
    .select("preferred_date, preferred_start_time, headcount")
    .eq("experience_type_id", type.id)
    .in("status", ["pending", "alternative_offered"])
    .gte("preferred_date", start)
    .lte("preferred_date", end);

  if (error) {
    // 資料表還沒建立時安靜地回空陣列——月曆不該因為這個附加功能而壞掉
    if (error.code === UNDEFINED_TABLE) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byKey = new Map<string, { date: string; startTime: string; headcount: number; requestCount: number }>();
  for (const r of data ?? []) {
    const date = r.preferred_date as string;
    const time = String(r.preferred_start_time).slice(0, 5);
    const key  = `${date}|${time}`;
    const g = byKey.get(key) ?? { date, startTime: time, headcount: 0, requestCount: 0 };
    g.headcount    += (r.headcount as number) ?? 0;
    g.requestCount += 1;
    byKey.set(key, g);
  }

  return NextResponse.json(
    [...byKey.values()]
      .filter(g => g.headcount >= MIN_PEOPLE_TO_SHOW)
      .sort((a, b) => a.date.localeCompare(b.date)),
  );
}
