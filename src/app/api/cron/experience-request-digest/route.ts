import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { sendAdminRequestDigest } from "@/lib/email";

/**
 * Vercel Cron：每天 05:00 UTC（台灣時間 13:00）。
 *
 * 一支排程做三件事，因為它們都是「時間到了要收尾」：
 *
 * 1. **待審積壓提醒**——客人收到的承諾是「兩個工作天內回覆」。沒有這封信，
 *    這個功能會在業主忙起來的那週死掉，不是因為做壞了，是因為沒人記得去
 *    看後台。無項目時不寄（每天一封「今天沒事」，兩週後就沒人看了）。
 *
 * 2. **核准逾期回收**——48 小時沒完成付款就把日期放回去。**場次已經有人
 *    付款時只標請求、不動場次**：那一場是真的成立了，回收它會殺掉別人的
 *    預約。
 *
 * 3. **替代方案逾期**——提了七天沒回應就結案，不然那筆會永遠掛在待處理。
 */

const DIGEST_AFTER_HOURS   = 24;
const APPROVAL_TTL_HOURS   = 48;
const ALTERNATIVE_TTL_DAYS = 7;

const UNDEFINED_TABLE = "42P01";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  // ── 1. 核准逾期 ────────────────────────────────────────────────────────
  const { data: staleApproved, error: approvedError } = await supabase
    .from("experience_requests")
    .select("id, session_id")
    .eq("status", "approved")
    .lt("token_expires_at", iso(now));

  if (approvedError?.code === UNDEFINED_TABLE) {
    return NextResponse.json(
      { error: "資料表尚未建立，請先執行 supabase/add_experience_requests.sql" },
      { status: 503 },
    );
  }

  let expiredApprovals = 0;
  let reclaimedSessions = 0;
  for (const r of staleApproved ?? []) {
    // 已經有人付款的場次不動——那一場是真的成立了，回收它會殺掉別人的預約
    let hasBooking = false;
    if (r.session_id) {
      const { count } = await supabase
        .from("experience_bookings")
        .select("id", { count: "exact", head: true })
        .eq("session_id", r.session_id)
        .eq("status", "confirmed");
      hasBooking = (count ?? 0) > 0;
    }

    if (r.session_id && !hasBooking) {
      await supabase.from("experience_sessions").delete().eq("id", r.session_id);
      reclaimedSessions += 1;
    }

    await supabase
      .from("experience_requests")
      .update({ status: "expired", token_expires_at: null, ...(hasBooking ? {} : { session_id: null }) })
      .eq("id", r.id);
    expiredApprovals += 1;
  }

  // ── 2. 替代方案逾期 ────────────────────────────────────────────────────
  const altCutoff = iso(now - ALTERNATIVE_TTL_DAYS * 86_400_000);
  const { data: staleAlternatives } = await supabase
    .from("experience_requests")
    .select("id")
    .eq("status", "alternative_offered")
    .lt("reviewed_at", altCutoff);

  for (const r of staleAlternatives ?? []) {
    await supabase.from("experience_requests").update({ status: "expired" }).eq("id", r.id);
  }

  // ── 3. 待審積壓彙整 ────────────────────────────────────────────────────
  const digestCutoff = iso(now - DIGEST_AFTER_HOURS * 3600_000);
  const { data: pending } = await supabase
    .from("experience_requests")
    .select("request_no, preferred_date, preferred_start_time, headcount, created_at, experience_types(name)")
    .eq("status", "pending")
    .lt("created_at", digestCutoff)
    .order("created_at");

  const items = (pending ?? []).map(r => ({
    requestNo:      r.request_no as string,
    experienceName: (r.experience_types as unknown as { name?: string } | null)?.name ?? "",
    date:           r.preferred_date as string,
    time:           String(r.preferred_start_time).slice(0, 5),
    headcount:      r.headcount as number,
    waitingHours:   Math.floor((now - Date.parse(r.created_at as string)) / 3600_000),
  }));

  // ── 4. 成團訊號：同時段累計已達該款的開團門檻 ────────────────────────
  //
  // 這是把「一筆一筆看」變成「系統告訴你哪天已經成團了」。散著看是三筆待審，
  // 聚起來是一場滿團——而業主不會每天自己去做這個加總。
  const { data: openPending } = await supabase
    .from("experience_requests")
    .select("experience_type_id, preferred_date, preferred_start_time, headcount, experience_types(name, request_min_slots)")
    .in("status", ["pending", "alternative_offered"]);

  const groups = new Map<string, { name: string; date: string; time: string; people: number; count: number; minSlots: number }>();
  for (const r of openPending ?? []) {
    const t = r.experience_types as unknown as { name?: string; request_min_slots?: number | null } | null;
    const time = String(r.preferred_start_time).slice(0, 5);
    const key  = `${r.experience_type_id}|${r.preferred_date}|${time}`;
    const g = groups.get(key) ?? {
      name: t?.name ?? "", date: r.preferred_date as string, time,
      people: 0, count: 0, minSlots: t?.request_min_slots ?? 4,
    };
    g.people += (r.headcount as number) ?? 0;
    g.count  += 1;
    groups.set(key, g);
  }
  const readyToOpen = [...groups.values()].filter(g => g.count > 1 && g.people >= g.minSlots);

  try {
    // 成團的那幾組排在最前面——那是業主看這封信最該先處理的東西
    await sendAdminRequestDigest([
      ...readyToOpen.map(g => ({
        requestNo:      "★ 可開課",
        experienceName: g.name,
        date:           g.date,
        time:           g.time,
        headcount:      g.people,
        waitingHours:   0,
      })),
      ...items,
    ]);
  } catch (err) {
    console.error("[request-digest] sendAdminRequestDigest failed:", err);
  }

  return NextResponse.json({
    ok: true,
    expiredApprovals,
    reclaimedSessions,
    expiredAlternatives: staleAlternatives?.length ?? 0,
    digestItems: items.length,
    readyToOpen: readyToOpen.length,
    approvalTtlHours: APPROVAL_TTL_HOURS,
  });
}
