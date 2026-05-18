import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { issuePoints } from "@/lib/points";

// Vercel Cron: 每天 02:00 UTC 執行
// 將活動結束超過 7 天、仍為 confirmed 的預約自動標記 completed 並發放點數

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 查詢所有 confirmed 的預約（含場次資訊）
  const { data: bookings, error } = await supabase
    .from("experience_bookings")
    .select("id, user_id, total_price, points_discount, session:experience_sessions(session_date, start_time)")
    .eq("status", "confirmed");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 篩選活動結束超過 7 天的預約
  const overdue = (bookings ?? []).filter(b => {
    const session = b.session as unknown as { session_date: string; start_time: string } | null;
    if (!session) return false;
    const sessionTime = new Date(`${session.session_date}T${session.start_time}`);
    return sessionTime < sevenDaysAgo;
  });

  const results = { completed: 0, pointsIssued: 0, skipped: 0, errors: 0 };

  for (const booking of overdue) {
    // 更新狀態為 completed
    const { error: updateError } = await supabase
      .from("experience_bookings")
      .update({ status: "completed" })
      .eq("id", booking.id);

    if (updateError) {
      console.error(`[cron] 更新 booking ${booking.id} 失敗:`, updateError.message);
      results.errors++;
      continue;
    }
    results.completed++;

    // 發放點數（有 user_id 才發）
    if (!booking.user_id) continue;

    // 防重複：確認是否已有 earn 記錄
    const { count } = await supabase
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", booking.id)
      .eq("type", "earn");

    if ((count ?? 0) > 0) {
      results.skipped++;
      continue;
    }

    // 新制：使用統一的 issuePoints 函式
    const pointsDiscount = booking.points_discount ?? 0;
    const earnBase = Math.max(booking.total_price - pointsDiscount, 0);

    try {
      const { points } = await issuePoints({
        userId: booking.user_id,
        earnBase,
        bookingId: booking.id,
        description: "體驗完成回饋",
      });
      if (points > 0) results.pointsIssued++;
    } catch (err) {
      console.error(`[cron] 發放點數 booking ${booking.id} 失敗:`, err);
      results.errors++;
    }
  }

  console.log("[cron] complete-bookings result:", results);
  return NextResponse.json({ ok: true, results });
}
