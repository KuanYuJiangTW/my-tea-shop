import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { approveRequest } from "@/lib/experience-request-review";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ token: string }> };

/**
 * 申請人選定其中一個替代方案 → 走**與核准完全相同**的流程（approveRequest
 * 的 override 參數）。三個入口共用一支服務，衝突檢查那類容易漏的一步才不會
 * 只在其中一條路上生效。
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!(await rateLimit(`choose-alt:${getClientIp(req)}`, 20, 60 * 60_000))) {
    return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
  }

  const { alternativeId } = await req.json().catch(() => ({}));
  if (typeof alternativeId !== "string" || !alternativeId) {
    return NextResponse.json({ error: "缺少選項" }, { status: 400 });
  }

  const { data: request, error } = await supabase
    .from("experience_requests")
    .select("id, status")
    .eq("token", token)
    .single();

  if (error || !request) return NextResponse.json({ error: "連結無效" }, { status: 404 });
  if (request.status !== "alternative_offered") {
    return NextResponse.json({ error: "這筆申請目前沒有待選的替代方案" }, { status: 409 });
  }

  // 選項必須屬於這一筆申請——不然拿到 A 的 token 就能選 B 的候選
  const { data: alt } = await supabase
    .from("experience_request_alternatives")
    .select("id, alt_date, alt_start_time")
    .eq("id", alternativeId)
    .eq("request_id", request.id)
    .maybeSingle();

  if (!alt) return NextResponse.json({ error: "找不到這個選項" }, { status: 404 });

  const result = await approveRequest(request.id as string, {
    overrideDate: alt.alt_date as string,
    overrideTime: String(alt.alt_start_time).slice(0, 5),
  });

  if (result.ok) {
    return NextResponse.json({ ok: true, token: result.token, total: result.total });
  }
  if (result.code === "conflict") {
    return NextResponse.json(
      { error: "很抱歉，這個時段剛剛被排走了。請聯絡我們安排其他時間" }, { status: 409 });
  }
  return NextResponse.json({ error: "處理失敗，請聯絡我們" }, { status: 500 });
}
