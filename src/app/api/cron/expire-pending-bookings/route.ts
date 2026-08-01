import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendBookingCancelEmail } from "@/lib/email";
import { refundBookingPoints } from "@/lib/points";

// Vercel Cron: 每天 03:30 UTC（台灣時間 11:30）執行
//
// 體驗預約的點數是在導向綠界「之前」就扣掉的（見
// openspec/specs/experience-booking-points/spec.md）。客人若放棄付款，
// 預約會永遠停在 pending_payment，扣掉的點數就這樣卡著——除非他自己
// 進會員中心按取消。這支 cron 就是收掉這種孤兒預約並把點數退回去。
//
// pending_payment 不佔名額（DB trigger 只計 confirmed），所以不必通知候補。

const EXPIRE_HOURS = 24;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: bookings, error } = await supabase
    .from("experience_bookings")
    .select(`
      id, user_id, created_at, booker_name, booker_email,
      session:experience_sessions(session_date, start_time, experience_types(name))
    `)
    .eq("status", "pending_payment");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - EXPIRE_HOURS * 60 * 60 * 1000);

  // 兩種都要收：建立超過 24 小時的，以及場次時間已經過去的。
  // 後者不能只靠 24 小時規則——場次 12 小時後開始的預約，撐不到逾期就過期了
  const expired = (bookings ?? []).filter(b => {
    if (new Date(b.created_at) < cutoff) return true;
    const s = b.session as unknown as { session_date: string; start_time: string } | null;
    if (!s) return false;
    return new Date(`${s.session_date}T${s.start_time}`) < now;
  });

  const results = { cancelled: 0, pointsRefunded: 0, errors: 0 };

  for (const booking of expired) {
    const { error: updateError } = await supabase
      .from("experience_bookings")
      .update({
        status:              "cancelled",
        cancelled_at:        now.toISOString(),
        cancellation_reason: "逾期未付款，系統自動取消",
        refund_amount:       0,      // 從未付款，沒有現金要退
        refund_status:       "none",
      })
      .eq("id", booking.id)
      .eq("status", "pending_payment"); // 併發保護：期間內若已被取消就跳過

    if (updateError) {
      console.error(`[cron] 取消逾期預約 ${booking.id} 失敗:`, updateError.message);
      results.errors++;
      continue;
    }
    results.cancelled++;

    // 全額退還折抵點數。從未付款成立，不套用距活動時間的退款比例
    if (booking.user_id) {
      try {
        const refunded = await refundBookingPoints({
          userId:      booking.user_id,
          bookingId:   booking.id,
          refundRate:  1,
          description: "逾期未付款取消退還點數",
        });
        if (refunded > 0) results.pointsRefunded++;
      } catch (err) {
        console.error(`[cron] 退點失敗 booking ${booking.id}:`, err);
        results.errors++;
      }
    }

    const session = booking.session as unknown as
      { session_date: string; start_time: string; experience_types?: { name: string } } | null;

    sendBookingCancelEmail({
      bookerName:     booking.booker_name,
      bookerEmail:    booking.booker_email,
      experienceName: session?.experience_types?.name ?? "茶藝體驗",
      sessionDate:    session?.session_date ?? "",
      startTime:      session?.start_time ?? "",
      refundAmount:   0,
      wasPending:     true,
    }).catch(console.error);
  }

  console.log("[cron] expire-pending-bookings result:", results);
  return NextResponse.json({ ok: true, results });
}
