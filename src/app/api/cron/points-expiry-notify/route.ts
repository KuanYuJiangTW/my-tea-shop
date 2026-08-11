import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPointsExpiryEmail } from "@/lib/email";

/**
 * 點數到期提醒：到期前 7 天一次、3 天再一次。
 *
 * 兩段的流程完全相同，抽成 `notifyWindow` 共用——舊版是兩段各寫一次約 60 行的
 * 重複程式碼，而兩段的標記邏輯正好各自壞在不同地方（見下方註解）。共用之後
 * 一處修正兩段生效，也不會再漂移。
 */

const DAY_MS = 24 * 60 * 60 * 1000;

type NotifyColumn = "notification_sent_7d" | "notification_sent_3d";

interface ExpiringTx {
  id: string;
  user_id: string;
  points: number;
  expires_at: string;
}

async function notifyWindow(opts: {
  now: Date;
  cutoff: string;
  column: NotifyColumn;
  label: string;
}): Promise<{ sent: number; errors: number }> {
  const { now, cutoff, column, label } = opts;

  // `id` 是必要欄位：標記段要靠主鍵鎖住「這次真的寄成功」的那幾列。
  // 舊版的 7 天查詢沒 select id，標記段卻用 `t.id` 組清單 → ids 恆為空陣列 →
  // `if (ids.length > 0)` 恆為 false → update 從未執行 → notification_sent_7d
  // 永遠是 false → 同一批人在到期前每天都收一封信。
  const { data, error } = await supabase
    .from("point_transactions")
    .select("id, user_id, points, expires_at")
    .gt("points", 0)
    .lte("expires_at", cutoff)
    .gt("expires_at", now.toISOString())
    .eq(column, false);

  if (error) {
    console.error(`[cron] points-expiry-notify ${label} 查詢失敗:`, error);
    return { sent: 0, errors: 1 };
  }

  const rows = (data ?? []) as ExpiringTx[];
  if (rows.length === 0) return { sent: 0, errors: 0 };

  // 一位會員一封信，多筆到期點數彙總
  const byUser = new Map<string, { ids: string[]; total: number; earliest: string }>();
  for (const tx of rows) {
    const cur = byUser.get(tx.user_id);
    if (!cur) {
      byUser.set(tx.user_id, { ids: [tx.id], total: tx.points, earliest: tx.expires_at });
      continue;
    }
    cur.ids.push(tx.id);
    cur.total += tx.points;
    if (tx.expires_at < cur.earliest) cur.earliest = tx.expires_at;
  }

  let sent = 0;
  let errors = 0;
  const notifiedIds: string[] = [];

  for (const [userId, info] of byUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    // 查不到 email 就跳過且不標記，下次執行還會再試
    if (!email) continue;

    const expiry = new Date(info.earliest);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);

    try {
      await sendPointsExpiryEmail({
        customerEmail:  email,
        customerName:   profile?.name ?? "會員",
        expiringPoints: info.total,
        expiryDate:     `${expiry.getFullYear()}/${expiry.getMonth() + 1}/${expiry.getDate()}`,
        daysLeft,
      });
      notifiedIds.push(...info.ids);
      sent++;
    } catch (e) {
      console.error(`[cron] points-expiry-notify ${label} 寄送失敗 user=${userId}:`, e);
      errors++;
    }
  }

  if (notifiedIds.length > 0) {
    // 只標記寄成功的列。舊版 3 天段是用查詢時的同一組 where 條件批次 update，
    // 寄信失敗的人一樣被標記成已通知，等於永久漏掉那批人
    const { error: updateError } = await supabase
      .from("point_transactions")
      .update({ [column]: true })
      .in("id", notifiedIds);

    if (updateError) {
      // 標記失敗代表下次會重寄。寧可重寄也不要漏寄，但要留下紀錄
      console.error(`[cron] points-expiry-notify ${label} 標記失敗（下次將重寄）:`, updateError);
      errors++;
    }
  }

  return { sent, errors };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * DAY_MS).toISOString();
  const in3d = new Date(now.getTime() + 3 * DAY_MS).toISOString();

  const r7d = await notifyWindow({ now, cutoff: in7d, column: "notification_sent_7d", label: "7d" });
  const r3d = await notifyWindow({ now, cutoff: in3d, column: "notification_sent_3d", label: "3d" });

  const results = { sent7d: r7d.sent, sent3d: r3d.sent, errors: r7d.errors + r3d.errors };

  console.log("[cron] points-expiry-notify result:", results);
  return NextResponse.json({ ok: true, results });
}
