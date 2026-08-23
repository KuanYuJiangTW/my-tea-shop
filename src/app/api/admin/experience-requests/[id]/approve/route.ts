import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/admin-auth-guard";
import { approveRequest } from "@/lib/experience-request-review";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/experience-requests/[id]/approve
 *
 * 衝突時回 409 並帶既有場次資訊，讓後台能提示「這天這個時段已經有場次了，
 * 建議請客人加入」——那本來就是更好的結果。
 */
export const POST = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;
  const body = await req.json().catch(() => ({}));

  const result = await approveRequest(id, {
    overrideDate: body?.date,
    overrideTime: body?.time,
  });

  if (result.ok) return NextResponse.json(result);

  switch (result.code) {
    case "not-found":  return NextResponse.json({ error: "找不到這筆申請" }, { status: 404 });
    case "bad-status": return NextResponse.json(
      { error: `目前狀態（${result.status}）不能核准`, status: result.status }, { status: 409 });
    case "conflict":   return NextResponse.json(
      { error: "這天這個時段已經有場次了，建議請客人加入既有場次", session: result.session }, { status: 409 });
    default:           return NextResponse.json({ error: result.message }, { status: 500 });
  }
}, "approve_experience_request");
