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

  try {
    await sendAdminRequestDigest(items);   // 空陣列時這支自己會 return
  } catch (err) {
    console.error("[request-digest] sendAdminRequestDigest failed:", err);
  }

  return NextResponse.json({
    ok: true,
    expiredApprovals,
    reclaimedSessions,
    expiredAlternatives: staleAlternatives?.length ?? 0,
    digestItems: items.length,
    approvalTtlHours: APPROVAL_TTL_HOURS,
  });
}
