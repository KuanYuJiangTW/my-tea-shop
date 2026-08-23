import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { calcRequestSlots, calcRequestTotal } from "@/lib/experience-requests";

/** 資料表還沒建立（未執行 supabase/add_experience_requests.sql） */
const UNDEFINED_TABLE = "42P01";

const NOT_MIGRATED = NextResponse.json(
  { error: "資料表尚未建立，請先在 Supabase SQL editor 執行 supabase/add_experience_requests.sql" },
  { status: 503 },
);

interface Row {
  id: string; request_no: string; status: string;
  experience_type_id: number; preferred_date: string; preferred_start_time: string;
  headcount: number; is_private: boolean;
  contact_name: string; contact_phone: string; contact_email: string;
  contact_line: string | null; contact_preference: string | null; contact_time: string | null;
  note: string | null; admin_note: string | null; decline_reason: string | null;
  token: string; token_expires_at: string | null; session_id: string | null;
  created_at: string; reviewed_at: string | null;
  experience_types: {
    name: string; slug: string; price: number;
    max_participants: number; request_min_slots: number | null;
  } | null;
}

/**
 * GET /api/admin/experience-requests
 *
 * 除了清單，還回一份**依「體驗 × 日期 × 時段」的聚合**。這是這個功能最直接
 * 的獲利點：三筆各 2、3、2 人的請求擠在同一天，散著看是三筆待審，聚起來是
 * 一場滿團——一次核准就好。
 */
export const GET = withAdminAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "pending";

  let q = supabase
    .from("experience_requests")
    .select("*, experience_types(name, slug, price, max_participants, request_min_slots)")
    .order("preferred_date", { ascending: true })
    .limit(300);

  if (status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) {
    return error.code === UNDEFINED_TABLE
      ? NOT_MIGRATED
      : NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Row[];

  const items = rows.map(r => {
    const t = r.experience_types;
    const shape = {
      price:           t?.price ?? 0,
      maxParticipants: t?.max_participants ?? 20,
      requestMinSlots: t?.request_min_slots ?? null,
    };
    const slots = calcRequestSlots(shape, r.headcount);
    return {
      ...r,
      slots,
      total: calcRequestTotal(shape, slots, r.preferred_date),
    };
  });

  // 聚合：只列出「多筆擠在同一時段」的，單獨一筆不必特別點出來
  const groups = new Map<string, {
    experienceTypeId: number; experience: string; date: string; time: string;
    count: number; people: number; revenue: number; ids: string[];
  }>();

  for (const r of items) {
    const key = `${r.experience_type_id}|${r.preferred_date}|${r.preferred_start_time}`;
    const g = groups.get(key) ?? {
      experienceTypeId: r.experience_type_id,
      experience: r.experience_types?.name ?? `#${r.experience_type_id}`,
      date: r.preferred_date,
      time: String(r.preferred_start_time).slice(0, 5),
      count: 0, people: 0, revenue: 0, ids: [],
    };
    g.count   += 1;
    g.people  += r.headcount;
    g.revenue += r.total;
    g.ids.push(r.id);
    groups.set(key, g);
  }

  return NextResponse.json({
    items,
    groups: [...groups.values()]
      .filter(g => g.count > 1)
      .sort((a, b) => b.people - a.people),
  });
});
