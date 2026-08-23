import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/admin-auth-guard";
import { approveGroup } from "@/lib/experience-request-review";

/**
 * 一次核准同一時段的多筆請求：只建一個場次，每筆各自拿到 token 與核准信。
 * 散著一筆一筆按的話，第二筆就會撞上衝突檢查。
 */
export const POST = withAdminAuth(async (req: NextRequest) => {
  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(i => typeof i === "string")) {
    return NextResponse.json({ error: "缺少要核准的申請" }, { status: 400 });
  }

  const result = await approveGroup(ids);
  if (!result.ok) {
    return NextResponse.json(
      { error: "第一筆核准失敗，整組沒有處理", failed: result.failed }, { status: 409 });
  }
  return NextResponse.json(result);
}, "approve_group_experience_requests");
