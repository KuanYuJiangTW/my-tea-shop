import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { canTransition } from "@/lib/experience-requests";
import { sendRequestDeclinedEmail } from "@/lib/email";
import { taipeiToday } from "@/lib/experience-ordering";
import type { ExperienceRequestStatus } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * 婉拒一筆申請。
 *
 * **信裡一定附上最近的可預約場次**——被婉拒但看到「這幾場還有位子」的客人，
 * 回頭率跟只收到「很抱歉」的差很多。所以這支要多查一次未來 60 天的公開場次。
 */
export const POST = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;
  const { reason } = await req.json().catch(() => ({}));

  if (reason !== undefined && reason !== null && (typeof reason !== "string" || reason.length > 500)) {
    return NextResponse.json({ error: "婉拒原因過長" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("experience_requests")
    .select("id, request_no, status, headcount, contact_name, contact_phone, contact_email, " +
            "locale, token, experience_type_id, preferred_date, preferred_start_time, " +
            "experience_types(name, slug, price, max_participants, request_min_slots)")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "找不到這筆申請" }, { status: 404 });

  const row = data as unknown as {
    id: string; request_no: string; status: ExperienceRequestStatus; headcount: number;
    contact_name: string; contact_phone: string; contact_email: string;
    locale: string; token: string; experience_type_id: number;
    preferred_date: string; preferred_start_time: string;
    experience_types: { name: string; slug: string; price: number; max_participants: number; request_min_slots: number | null } | null;
  };

  if (!canTransition(row.status, "declined")) {
    return NextResponse.json({ error: `目前狀態（${row.status}）不能婉拒` }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from("experience_requests")
    .update({
      status:         "declined",
      decline_reason: reason || null,
      reviewed_at:    new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // 未來 60 天內、同一款體驗、還開著的公開場次，最多三場
  const today = taipeiToday();
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + 60 * 86_400_000).toISOString().slice(0, 10);
  const { data: upcoming } = await supabase
    .from("experience_sessions")
    .select("session_date, start_time")
    .eq("experience_type_id", row.experience_type_id)
    .eq("status", "open")
    .gte("session_date", today)
    .lte("session_date", until)
    .order("session_date")
    .limit(3);

  try {
    await sendRequestDeclinedEmail({
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
      reason:         reason || undefined,
      upcoming: (upcoming ?? []).map(u => ({
        date: u.session_date as string,
        time: String(u.start_time).slice(0, 5),
        slug: row.experience_types?.slug ?? "",
      })),
    });
  } catch (err) {
    console.error("[request-decline] sendRequestDeclinedEmail failed:", err);
  }

  return NextResponse.json({ ok: true });
}, "decline_experience_request");
