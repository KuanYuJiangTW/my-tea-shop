import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

/**
 * 「想來但沒訂到」的需求清單（客製開課請求 Phase 0 的後台）。
 *
 * 刻意只有兩個動作：看清單、標記處理過。沒有審核狀態機——那是完整版
 * （openspec/changes/experience-open-class-request）的事，這裡只負責讓
 * 業主看得到訊號並自己聯絡。
 */

/** 資料表還沒建立（未執行 supabase/add_experience_interest.sql） */
const UNDEFINED_TABLE = "42P01";

const NOT_MIGRATED = NextResponse.json(
  { error: "資料表尚未建立，請先在 Supabase SQL editor 執行 supabase/add_experience_interest.sql" },
  { status: 503 },
);

export const GET = withAdminAuth(async (req: NextRequest) => {
  // 預設只看未處理的；?all=1 看全部
  const all = req.nextUrl.searchParams.get("all") === "1";

  let q = supabase
    .from("experience_interest")
    .select("*, experience_types(name, slug)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (!all) q = q.is("handled_at", null);

  const { data, error } = await q;

  if (error) {
    return error.code === UNDEFINED_TABLE
      ? NOT_MIGRATED
      : NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 同時回一份「哪個體驗、哪一天最多人問」的彙總——散著看看不出成團機會，
  // 三筆各 2 人擠在同一天才是真正該開課的訊號
  const groups = new Map<string, { experience: string; date: string | null; count: number; people: number }>();
  for (const r of data ?? []) {
    const exp = (r.experience_types as { name?: string } | null)?.name ?? `#${r.experience_type_id}`;
    const key = `${exp}|${r.preferred_date ?? ""}`;
    const g = groups.get(key) ?? { experience: exp, date: r.preferred_date, count: 0, people: 0 };
    g.count  += 1;
    g.people += r.headcount ?? 0;
    groups.set(key, g);
  }

  return NextResponse.json({
    items: data ?? [],
    groups: [...groups.values()]
      .filter(g => g.count > 1 || g.people >= 4)   // 只有一筆一人的不必特別點出來
      .sort((a, b) => b.people - a.people || b.count - a.count),
  });
});

export const PATCH = withAdminAuth(async (req: NextRequest) => {
  const { id, handled } = await req.json();
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("experience_interest")
    .update({ handled_at: handled === false ? null : new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return error.code === UNDEFINED_TABLE
      ? NOT_MIGRATED
      : NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});
