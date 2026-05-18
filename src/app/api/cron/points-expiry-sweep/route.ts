import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Vercel Cron: 每日 UTC 02:00
// 掃描已過期但尚未沖銷的正值點數，寫入 points_expiry_events

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 查詢已過期、正值、尚未標記為已沖銷的點數交易
  // 用 is_expired_swept 欄位避免重複沖銷（若無此欄位則用 expires_at < now 且不在 events 中）
  const { data: expiredTxns, error } = await supabase
    .from("point_transactions")
    .select("id, user_id, points, expires_at")
    .gt("points", 0)
    .lt("expires_at", now)
    .is("swept_at", null);

  if (error) {
    console.error("[cron] points-expiry-sweep query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiredTxns || expiredTxns.length === 0) {
    return NextResponse.json({ ok: true, swept: 0 });
  }

  // 按 user_id 聚合
  const userMap = new Map<string, number>();
  const txnIds: string[] = [];

  for (const txn of expiredTxns) {
    userMap.set(txn.user_id, (userMap.get(txn.user_id) ?? 0) + txn.points);
    txnIds.push(txn.id);
  }

  // 寫入 points_expiry_events
  const events = Array.from(userMap.entries()).map(([userId, points]) => ({
    user_id: userId,
    points_expired: points,
    expired_at: now,
  }));

  const { error: insertError } = await supabase
    .from("points_expiry_events")
    .insert(events);

  if (insertError) {
    console.error("[cron] points-expiry-sweep insert error:", insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 標記已沖銷
  const { error: updateError } = await supabase
    .from("point_transactions")
    .update({ swept_at: now })
    .in("id", txnIds);

  if (updateError) {
    console.error("[cron] points-expiry-sweep update error:", updateError.message);
  }

  console.log(`[cron] points-expiry-sweep: ${events.length} users, ${txnIds.length} transactions swept`);
  return NextResponse.json({ ok: true, swept: txnIds.length, users: events.length });
}
