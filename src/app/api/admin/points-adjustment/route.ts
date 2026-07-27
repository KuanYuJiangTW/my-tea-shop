import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getValidBalance } from "@/lib/points";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// POST /api/admin/points-adjustment — 手動調整點數（加/扣）
export const POST = withAdminAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { userId, points, adminId, adminNote } = body as {
    userId: string;
    points: number;    // 正值=加點，負值=扣點
    adminId: string;
    adminNote: string;
  };

  // 驗證必填
  if (!userId || points == null || !adminId) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  if (points === 0) {
    return NextResponse.json({ error: "調整點數不可為 0" }, { status: 400 });
  }
  if (!adminNote?.trim()) {
    return NextResponse.json({ error: "必須填寫調整原因" }, { status: 400 });
  }

  // 扣點時檢查餘額
  if (points < 0) {
    const balance = await getValidBalance(userId);
    if (balance + points < 0) {
      return NextResponse.json(
        { error: `餘額不足，目前有效點數為 ${balance}` },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("point_transactions")
    .insert({
      user_id: userId,
      points,
      type: "adjustment",
      admin_id: adminId,
      admin_note: adminNote.trim(),
      description: `管理員調整：${adminNote.trim()}`,
      expires_at: points > 0
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, transaction: data });
}, "adjust_points");
