import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as adminSupabase } from "@/lib/supabase";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
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
    .select("id, created_at, total_amount, order_status, payment_status, payment_method, items, shipping_address")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 點數記錄
  const { data: pointTxs } = await adminSupabase
    .from("point_transactions")
    .select("id, points, type, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const pointsBalance = (pointTxs ?? []).reduce((sum: number, t: { points: number }) => sum + t.points, 0);

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
