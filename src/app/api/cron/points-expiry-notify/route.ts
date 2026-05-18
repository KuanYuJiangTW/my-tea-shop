import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPointsExpiryEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const results = { sent7d: 0, sent3d: 0, errors: 0 };

  // ── 7 天通知 ──────────────────────────────────────────────────────────
  const { data: expiring7d } = await supabase
    .from("point_transactions")
    .select("user_id, points, expires_at")
    .gt("points", 0)
    .lte("expires_at", in7d)
    .gt("expires_at", now.toISOString())
    .eq("notification_sent_7d", false);

  // 按 user_id 彙總
  const user7dMap = new Map<string, { total: number; earliestExpiry: string }>();
  for (const tx of expiring7d ?? []) {
    const existing = user7dMap.get(tx.user_id);
    if (existing) {
      existing.total += tx.points;
      if (tx.expires_at < existing.earliestExpiry) existing.earliestExpiry = tx.expires_at;
    } else {
      user7dMap.set(tx.user_id, { total: tx.points, earliestExpiry: tx.expires_at });
    }
  }

  for (const [userId, info] of user7dMap) {
    // 查用戶 email + name
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) continue;

    const expiryDate = new Date(info.earliestExpiry);
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    try {
      await sendPointsExpiryEmail({
        customerEmail: email,
        customerName: profile?.name ?? "會員",
        expiringPoints: info.total,
        expiryDate: `${expiryDate.getFullYear()}/${expiryDate.getMonth() + 1}/${expiryDate.getDate()}`,
        daysLeft,
      });
      results.sent7d++;
    } catch (e) {
      console.error(`[cron] points-expiry-notify 7d failed for ${userId}:`, e);
      results.errors++;
    }
  }

  // 標記已通知
  if (expiring7d && expiring7d.length > 0) {
    const ids = expiring7d.map(t => (t as unknown as { id: string }).id).filter(Boolean);
    if (ids.length > 0) {
      await supabase
        .from("point_transactions")
        .update({ notification_sent_7d: true })
        .gt("points", 0)
        .lte("expires_at", in7d)
        .gt("expires_at", now.toISOString())
        .eq("notification_sent_7d", false);
    }
  }

  // ── 3 天通知 ──────────────────────────────────────────────────────────
  const { data: expiring3d } = await supabase
    .from("point_transactions")
    .select("user_id, points, expires_at")
    .gt("points", 0)
    .lte("expires_at", in3d)
    .gt("expires_at", now.toISOString())
    .eq("notification_sent_3d", false);

  const user3dMap = new Map<string, { total: number; earliestExpiry: string }>();
  for (const tx of expiring3d ?? []) {
    const existing = user3dMap.get(tx.user_id);
    if (existing) {
      existing.total += tx.points;
      if (tx.expires_at < existing.earliestExpiry) existing.earliestExpiry = tx.expires_at;
    } else {
      user3dMap.set(tx.user_id, { total: tx.points, earliestExpiry: tx.expires_at });
    }
  }

  for (const [userId, info] of user3dMap) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) continue;

    const expiryDate = new Date(info.earliestExpiry);
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    try {
      await sendPointsExpiryEmail({
        customerEmail: email,
        customerName: profile?.name ?? "會員",
        expiringPoints: info.total,
        expiryDate: `${expiryDate.getFullYear()}/${expiryDate.getMonth() + 1}/${expiryDate.getDate()}`,
        daysLeft,
      });
      results.sent3d++;
    } catch (e) {
      console.error(`[cron] points-expiry-notify 3d failed for ${userId}:`, e);
      results.errors++;
    }
  }

  if (expiring3d && expiring3d.length > 0) {
    await supabase
      .from("point_transactions")
      .update({ notification_sent_3d: true })
      .gt("points", 0)
      .lte("expires_at", in3d)
      .gt("expires_at", now.toISOString())
      .eq("notification_sent_3d", false);
  }

  console.log("[cron] points-expiry-notify result:", results);
  return NextResponse.json({ ok: true, results });
}
