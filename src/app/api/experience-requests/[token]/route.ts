import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import {
  calcRequestSlots,
  calcRequestTotal,
  canTransition,
} from "@/lib/experience-requests";
import type { ExperienceRequestStatus } from "@/types";

/**
 * 申請人的自助查詢與撤回，憑不可猜的 token（design.md D2）。
 *
 * **回應絕不含 `admin_note`**——那是內部備註。也絕不回其他請求的任何資料：
 * token 只對應到它自己那一筆。
 */

type Params = { params: Promise<{ token: string }> };

/** 客人端看得到的欄位。刻意用白名單而不是 `select("*")` 再刪——漏刪就是外洩 */
const CLIENT_FIELDS =
  "request_no, status, preferred_date, preferred_start_time, alt_date, alt_start_time, " +
  "headcount, is_private, contact_name, token_expires_at, session_id, created_at, " +
  "experience_types(id, slug, name, name_en, price, max_participants, request_min_slots, request_lead_days)";

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "查詢連結無效" }, { status: 404 });

  const { data, error } = await supabase
    .from("experience_requests")
    .select(CLIENT_FIELDS)
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "查詢連結無效" }, { status: 404 });
  }

  // select 是字串拼出來的，型別推導不出形狀——這裡明確標註實際回傳的欄位
  const row = data as unknown as {
    request_no: string; status: ExperienceRequestStatus;
    preferred_date: string; preferred_start_time: string;
    alt_date: string | null; alt_start_time: string | null;
    headcount: number; is_private: boolean; contact_name: string;
    token_expires_at: string | null; session_id: string | null; created_at: string;
    experience_types: {
      id: number; slug: string; name: string; name_en: string;
      price: number; max_participants: number;
      request_min_slots: number | null; request_lead_days: number | null;
    } | null;
  };
  const type = row.experience_types;

  // 金額在查詢時重算，不從資料庫讀——名額與價格是體驗的屬性，
  // 存一份快照下來會在改價後變成兩個不一致的數字
  const slots = type
    ? calcRequestSlots({
        price: type.price,
        maxParticipants: type.max_participants,
        requestMinSlots: type.request_min_slots,
      }, row.headcount as number)
    : null;

  return NextResponse.json({
    requestNo:          row.request_no,
    status:             row.status,
    preferredDate:      row.preferred_date,
    preferredStartTime: row.preferred_start_time,
    altDate:            row.alt_date,
    altStartTime:       row.alt_start_time,
    headcount:          row.headcount,
    isPrivate:          row.is_private,
    contactName:        row.contact_name,
    tokenExpiresAt:     row.token_expires_at,
    sessionId:          row.session_id,
    createdAt:          row.created_at,
    experience: type ? { slug: type.slug, name: type.name, nameEn: type.name_en } : null,
    slots,
    total: type && slots
      ? calcRequestTotal(
          { price: type.price, maxParticipants: type.max_participants },
          slots,
          row.preferred_date as string,
        )
      : null,
  });
}

/** 申請人自己撤回。只有還沒定案的狀態可以撤，已核准要走人工（怕他其實已經付了） */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "查詢連結無效" }, { status: 404 });

  const { data, error } = await supabase
    .from("experience_requests")
    .select("id, status")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "查詢連結無效" }, { status: 404 });
  }

  const status = data.status as ExperienceRequestStatus;
  if (!canTransition(status, "withdrawn")) {
    return NextResponse.json(
      { error: "這筆申請已經無法自行撤回，請直接聯絡我們", status },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from("experience_requests")
    .update({ status: "withdrawn" })
    .eq("id", data.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: "withdrawn" });
}
