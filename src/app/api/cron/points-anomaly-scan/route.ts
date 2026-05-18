import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendAnomalyAlertEmail } from "@/lib/email";

// Vercel Cron: 每日 UTC 03:00
// 掃描當日點數異常：flagged 記錄 + 單日折抵超額

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartStr = todayStart.toISOString();

  // 1. 查詢今日 flagged 記錄
  const { data: flagged } = await supabase
    .from("point_transactions")
    .select("id, user_id, points, multiplier, description, created_at")
    .eq("is_flagged", true)
    .gte("created_at", todayStartStr);

  // 2. 查詢今日所有 redeem，按 user 聚合找超額（> 500）
  const { data: redeems } = await supabase
    .from("point_transactions")
    .select("user_id, points")
    .eq("type", "redeem")
    .gte("created_at", todayStartStr);

  const userRedeemMap = new Map<string, number>();
  for (const r of redeems ?? []) {
    userRedeemMap.set(r.user_id, (userRedeemMap.get(r.user_id) ?? 0) + Math.abs(r.points));
  }

  const excessiveRedeems = Array.from(userRedeemMap.entries())
    .filter(([, total]) => total > 500)
    .map(([userId, total]) => ({ userId, total }));

  const flaggedCount = flagged?.length ?? 0;
  const excessiveCount = excessiveRedeems.length;

  if (flaggedCount === 0 && excessiveCount === 0) {
    return NextResponse.json({ ok: true, anomalies: 0 });
  }

  // 發送摘要 email 給管理員
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const lines: string[] = [];

    if (flaggedCount > 0) {
      lines.push(`高倍率警示記錄：${flaggedCount} 筆`);
      for (const f of flagged!) {
        lines.push(`  - user: ${f.user_id.slice(0, 8)}... | ${f.points} 點 | multiplier: ${f.multiplier} | ${f.description}`);
      }
    }

    if (excessiveCount > 0) {
      lines.push(`單日超額折抵（>500）：${excessiveCount} 位用戶`);
      for (const e of excessiveRedeems) {
        lines.push(`  - user: ${e.userId.slice(0, 8)}... | 合計折抵 ${e.total} 點`);
      }
    }

    const anomalies: { userId: string; type: string; detail: string }[] = [];

    for (const f of flagged ?? []) {
      anomalies.push({
        userId: f.user_id,
        type: "高倍率警示",
        detail: `${f.points} 點 | multiplier: ${f.multiplier} | ${f.description}`,
      });
    }

    for (const e of excessiveRedeems) {
      anomalies.push({
        userId: e.userId,
        type: "單日超額折抵",
        detail: `合計折抵 ${e.total} 點`,
      });
    }

    await sendAnomalyAlertEmail({
      anomalies,
      date: new Date().toLocaleDateString("zh-TW"),
    });
  }

  console.log(`[cron] points-anomaly-scan: ${flaggedCount} flagged, ${excessiveCount} excessive redeems`);
  return NextResponse.json({ ok: true, flaggedCount, excessiveCount });
}
