import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/admin-auth-guard";
import { revokeApproval } from "@/lib/experience-request-review";

type Params = { params: Promise<{ id: string }> };

/** 撤銷核准。已經有 confirmed 預約時回 409——那要走既有的取消與退款流程 */
export const POST = withAdminAuth(async (_req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;
  const result = await revokeApproval(id);

  if (result.ok) return NextResponse.json({ ok: true });

  switch (result.code) {
    case "not-found":   return NextResponse.json({ error: "找不到這筆申請" }, { status: 404 });
    case "bad-status":  return NextResponse.json({ error: "目前狀態不能撤銷核准" }, { status: 409 });
    case "has-booking": return NextResponse.json(
      { error: "這個場次已經有人付款了，請改走場次取消與退款流程" }, { status: 409 });
    default:            return NextResponse.json({ error: result.message }, { status: 500 });
  }
}, "revoke_experience_request");
