import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// GET /api/admin/points-export?userId=xxx — 匯出點數明細 CSV
export const GET = withAdminAuth(async (req: NextRequest) => {
  const userId = req.nextUrl.searchParams.get("userId");

  let query = supabase
    .from("point_transactions")
    .select("id, user_id, points, type, description, admin_note, multiplier, created_at, expires_at, is_flagged")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = "ID,用戶ID,點數,類型,說明,管理備註,倍率,建立時間,到期時間,異常標記";
  const rows = (data ?? []).map(t => [
    t.id,
    t.user_id,
    t.points,
    t.type,
    `"${(t.description ?? "").replace(/"/g, '""')}"`,
    `"${(t.admin_note ?? "").replace(/"/g, '""')}"`,
    t.multiplier ?? "",
    t.created_at,
    t.expires_at ?? "",
    t.is_flagged ? "Y" : "",
  ].join(","));

  const csv = "\uFEFF" + [header, ...rows].join("\n"); // BOM for Excel

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="points-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}, "export_points"); // 大量 PII 匯出，留審計軌跡
