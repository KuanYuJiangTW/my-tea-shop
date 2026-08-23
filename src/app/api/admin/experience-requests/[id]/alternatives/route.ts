import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { canTransition } from "@/lib/experience-requests";
import { sendRequestAlternativeEmail } from "@/lib/email";
import type { ExperienceRequestStatus } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * 提出 1–3 個替代日期時段。
 *
 * 這支取代的是「打電話喬時間卻沒人記得喬到哪」——候選寫進資料庫、寄信讓客人
 * 一鍵選，選了就進入與核准相同的建場次流程（見 approveRequest 的 override）。
 */
export const POST = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;
  const { alternatives } = await req.json().catch(() => ({}));

  if (!Array.isArray(alternatives) || alternatives.length < 1 || alternatives.length > 3) {
    return NextResponse.json({ error: "請提供 1 至 3 組候選日期時段" }, { status: 400 });
  }
  for (const a of alternatives) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a?.date) || !/^\d{2}:\d{2}$/.test(a?.time)) {
      return NextResponse.json({ error: "候選的日期或時段格式不正確" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("experience_requests")
    .select("id, request_no, status, headcount, contact_name, contact_phone, contact_email, " +
            "locale, token, preferred_date, preferred_start_time, experience_types(name)")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "找不到這筆申請" }, { status: 404 });

  const row = data as unknown as {
    id: string; request_no: string; status: ExperienceRequestStatus; headcount: number;
    contact_name: string; contact_phone: string; contact_email: string;
    locale: string; token: string; preferred_date: string; preferred_start_time: string;
    experience_types: { name: string } | null;
  };

  if (!canTransition(row.status, "alternative_offered")) {
    return NextResponse.json({ error: `目前狀態（${row.status}）不能提替代方案` }, { status: 409 });
  }

  // 重提時先清掉舊的候選，避免客人收到兩封信、點到已經作廢的選項
  await supabase.from("experience_request_alternatives").delete().eq("request_id", id);

  const { data: created, error: insertError } = await supabase
    .from("experience_request_alternatives")
    .insert(alternatives.map((a: { date: string; time: string; sessionId?: string }, i: number) => ({
      request_id:          id,
      alt_date:            a.date,
      alt_start_time:      a.time,
      existing_session_id: a.sessionId || null,
      sort_order:          i,
    })))
    .select("id, alt_date, alt_start_time, existing_session_id");

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { error: updateError } = await supabase
    .from("experience_requests")
    .update({ status: "alternative_offered", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  try {
    await sendRequestAlternativeEmail({
      requestNo:      row.request_no,
      token:          row.token,
      experienceName: row.experience_types?.name ?? "",
      preferredDate:  row.preferred_date,
      preferredStartTime: row.preferred_start_time,
      headcount:      row.headcount,
      slots:          row.headcount,
      total:          0,
      contactName:    row.contact_name,
      contactPhone:   row.contact_phone,
      contactEmail:   row.contact_email,
      locale:         row.locale,
      alternatives: (created ?? []).map(a => ({
        id:   a.id as string,
        date: a.alt_date as string,
        time: String(a.alt_start_time).slice(0, 5),
        isExistingSession: !!a.existing_session_id,
      })),
    });
  } catch (err) {
    console.error("[request-alternatives] sendRequestAlternativeEmail failed:", err);
  }

  return NextResponse.json({ ok: true, count: created?.length ?? 0 });
}, "offer_alternatives_experience_request");
