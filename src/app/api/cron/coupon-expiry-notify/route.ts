import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendCouponExpiryEmail } from "@/lib/email";

/**
 * 折價券到期提醒。
 *
 * 依賴 `coupons.notification_sent_7d` —— 見 `supabase/add_coupon_expiry_notification.sql`，
 * 該欄位不存在時本 cron 每次都會 500。
 *
 * 只做 7 天一次提醒，不做 points 那套的 7+3 兩段。歡迎券效期只有 30 天，
 * 兩段提醒對一張 NT$50 的券是騷擾。
 */

const DAYS_BEFORE = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

interface ExpiringCoupon {
  id: string;
  user_id: string;
  discount_amount: number;
  min_order_amount: number;
  expires_at: string;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + DAYS_BEFORE * DAY_MS).toISOString();

  const { data, error } = await supabase
    .from("coupons")
    .select("id, user_id, discount_amount, min_order_amount, expires_at")
    .is("used_at", null)
    .eq("notification_sent_7d", false)
    .gt("expires_at", now.toISOString())
    .lte("expires_at", cutoff);

  if (error) {
    console.error("[cron] coupon-expiry-notify 查詢失敗:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const expiring = (data ?? []) as ExpiringCoupon[];
  const results = { sent: 0, errors: 0, coupons: expiring.length };

  if (expiring.length === 0) {
    console.log("[cron] coupon-expiry-notify result:", results);
    return NextResponse.json({ ok: true, results });
  }

  // 一位會員一封信。同時持有多張即將到期的券時逐張寄等於騷擾
  interface Agg { ids: string[]; count: number; total: number; minOrder: number; earliest: string }
  const byUser = new Map<string, Agg>();

  for (const c of expiring) {
    const cur = byUser.get(c.user_id);
    if (!cur) {
      byUser.set(c.user_id, {
        ids: [c.id], count: 1, total: c.discount_amount,
        minOrder: c.min_order_amount, earliest: c.expires_at,
      });
      continue;
    }
    cur.ids.push(c.id);
    cur.count++;
    cur.total += c.discount_amount;
    // 門檻取最低的那張：信裡要講的是「最容易用掉的條件」，不是最嚴格的
    if (c.min_order_amount < cur.minOrder) cur.minOrder = c.min_order_amount;
    if (c.expires_at < cur.earliest) cur.earliest = c.expires_at;
  }

  const notifiedIds: string[] = [];

  for (const [userId, agg] of byUser) {
    const { data: profile } = await supabase
      .from("profiles").select("name").eq("id", userId).single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    // 查不到 email 就跳過且不標記，下次執行還會再試
    if (!email) continue;

    const expiry = new Date(agg.earliest);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);

    try {
      await sendCouponExpiryEmail({
        customerEmail:  email,
        customerName:   profile?.name ?? "會員",
        couponCount:    agg.count,
        totalValue:     agg.total,
        minOrderAmount: agg.minOrder,
        expiryDate:     `${expiry.getFullYear()}/${expiry.getMonth() + 1}/${expiry.getDate()}`,
        daysLeft,
      });
      // 只標記「寄成功」的券。points-expiry-notify 是在迴圈外用同一組 where
      // 條件批次 update，寄信失敗的人一樣被標記成已通知，等於永久漏掉那批人——
      // 這裡不複製那個行為
      notifiedIds.push(...agg.ids);
      results.sent++;
    } catch (e) {
      console.error(`[cron] coupon-expiry-notify 寄送失敗 user=${userId}:`, e);
      results.errors++;
    }
  }

  if (notifiedIds.length > 0) {
    const { error: updateError } = await supabase
      .from("coupons")
      .update({ notification_sent_7d: true })
      .in("id", notifiedIds);

    if (updateError) {
      // 標記失敗代表下次會重寄。寧可重寄也不要漏寄，但要留下紀錄
      console.error("[cron] coupon-expiry-notify 標記失敗（下次將重寄）:", updateError);
      results.errors++;
    }
  }

  console.log("[cron] coupon-expiry-notify result:", results);
  return NextResponse.json({ ok: true, results });
}
