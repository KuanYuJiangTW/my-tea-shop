import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as adminSupabase } from "@/lib/supabase";
import { getValidBalance, getUserTier } from "@/lib/points";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: { user } }, locale] = await Promise.all([
    supabase.auth.getUser(),
    getLocale(),
  ]);
  const lp = (path: string) => locale === "en" ? `/en${path}` : path;

  if (!user) {
    redirect(lp("/auth/login"));
  }

  // 確保 profile 存在
  await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, phone, city, address")
    .eq("id", user.id)
    .single();

  // 取得歷史訂單（service role key 繞過 RLS）
  const { data: orders } = await adminSupabase
    .from("orders")
    .select("id, created_at, total_amount, order_status, payment_status, payment_method, items, shipping_address, shipping_fee, discount_amount")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 點數記錄 + 有效餘額 + 等級
  const { data: pointTxs } = await adminSupabase
    .from("point_transactions")
    .select("id, points, type, description, created_at, expires_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const pointsBalance = await getValidBalance(user.id);
  const memberTier = await getUserTier(user.id);

  // 年消費 + 即將到期點數
  const { data: membership } = await adminSupabase
    .from("user_membership")
    .select("annual_spend")
    .eq("user_id", user.id)
    .single();
  const annualSpend = membership?.annual_spend ?? 0;

  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const { data: expiringTxs } = await adminSupabase
    .from("point_transactions")
    .select("points, expires_at")
    .eq("user_id", user.id)
    .gt("points", 0)
    .gt("expires_at", now)
    .lte("expires_at", thirtyDaysLater);
  const expiringPoints = (expiringTxs ?? []).reduce((s, t) => s + t.points, 0);
  const earliestExpiry = (expiringTxs ?? [])
    .map(t => t.expires_at)
    .filter(Boolean)
    .sort()[0] ?? null;

  // 折價券（可用 + 已使用，共同顯示）
  const { data: coupons } = await adminSupabase
    .from("coupons")
    .select("id, code, source, discount_amount, min_order_amount, expires_at, used_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 體驗預約
  const { data: bookings } = await adminSupabase
    .from("experience_bookings")
    .select(`
      id, created_at, status, participant_count, total_price, points_discount, participants_due_at, refund_amount,
      session:experience_sessions(session_date, start_time, experience_types(name))
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 已評價的預約 IDs（獨立查詢，不依賴 FK join）
  const { data: reviewedRows } = await adminSupabase
    .from("experience_reviews")
    .select("booking_id")
    .eq("user_id", user.id);
  const reviewedIds = new Set((reviewedRows ?? []).map((r: { booking_id: string }) => r.booking_id));

  // 候補記錄（待確認或候補中）
  const { data: waitlist } = await adminSupabase
    .from("waitlist_entries")
    .select(`
      id, status, participant_count, confirm_deadline, created_at,
      session:experience_sessions(session_date, start_time, experience_types(name))
    `)
    .eq("user_id", user.id)
    .in("status", ["waiting", "notified"])
    .order("created_at", { ascending: false });

  return (
    <Suspense>
      <AccountClient
        user={{ id: user.id, email: user.email ?? "" }}
        profile={profile ?? null}
        orders={orders ?? []}
        pointsBalance={pointsBalance}
        memberTier={{ id: memberTier.id, name: memberTier.name, points_rate: memberTier.points_rate, max_discount_rate: memberTier.max_discount_rate, min_annual_spend: memberTier.min_annual_spend }}
        annualSpend={annualSpend}
        expiringPoints={expiringPoints}
        earliestExpiry={earliestExpiry}
        pointTransactions={pointTxs ?? []}
        coupons={coupons ?? []}
        bookings={
          (bookings ?? []).map((b: Record<string, unknown>) => ({
            ...b,
            has_review: reviewedIds.has(b.id as string),
          })) as unknown as Parameters<typeof AccountClient>[0]["bookings"]
        }
        waitlist={(waitlist ?? []) as unknown as Parameters<typeof AccountClient>[0]["waitlist"]}
      />
    </Suspense>
  );
}
