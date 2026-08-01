import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  sendParticipantFillReminder,
  sendSessionConfirmEmail,
  sendSessionCancelEmail,
  sendDayBeforeReminder,
  sendAdminSessionCancelNotice,
  sendAdminPendingRefundDigest,
} from "@/lib/email";
import { expireWaitlistAndNotifyNext } from "@/lib/waitlist";
import { refundBookingPoints } from "@/lib/points";

// Vercel Cron: 每天 01:00 UTC（台灣時間 09:00）執行
// 受 CRON_SECRET 保護，只有 Vercel 可以呼叫

function targetDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function GET(req: NextRequest) {
  // 驗證 Vercel Cron Secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

  const results = {
    fillReminders:   { sent: 0, errors: 0 },
    confirmOrCancel: { confirmed: 0, cancelled: 0, errors: 0 },
    dayBefore:       { sent: 0, errors: 0 },
  };

  // ── 1. 5天前：補填參加者資料提醒 ──────────────────────────────────────────
  const date5 = targetDate(5);
  const { data: sessions5 } = await supabase
    .from("experience_sessions")
    .select("id, experience_type_id, session_date, start_time, experience_types(name)")
    .eq("session_date", date5)
    .neq("status", "cancelled");

  if (sessions5) {
    for (const session of sessions5) {
      // 取得該場次所有已確認預約
      const { data: bookings } = await supabase
        .from("experience_bookings")
        .select("id, booker_name, booker_email, participant_count")
        .eq("session_id", session.id)
        .eq("status", "confirmed");

      if (!bookings) continue;

      for (const booking of bookings) {
        // 計算已填人數
        const { count: filledCount } = await supabase
          .from("booking_participants")
          .select("*", { count: "exact", head: true })
          .eq("booking_id", booking.id);

        const filled = filledCount ?? 0;
        if (filled >= booking.participant_count) continue; // 已全填，不提醒

        try {
          await sendParticipantFillReminder({
            bookingId:           booking.id,
            bookerName:          booking.booker_name,
            bookerEmail:         booking.booker_email,
            experienceName:      (session.experience_types as unknown as { name: string } | null)?.name ?? "茶藝體驗",
            sessionDate:         session.session_date,
            startTime:           session.start_time,
            participantCount:    booking.participant_count,
            filledCount:         filled,
            participantsFillUrl: `${base}/account/bookings/${booking.id}/participants`,
          });
          results.fillReminders.sent++;
        } catch {
          results.fillReminders.errors++;
        }
      }
    }
  }

  // ── 2. 3天前：確認開課 or 取消 ────────────────────────────────────────────
  const date3 = targetDate(3);
  const { data: sessions3 } = await supabase
    .from("experience_sessions")
    .select(`
      id, session_date, start_time, current_participants,
      experience_types(name, min_participants)
    `)
    .eq("session_date", date3)
    .neq("status", "cancelled");

  if (sessions3) {
    for (const session of sessions3) {
      const expType = session.experience_types as unknown as { name: string; min_participants: number } | null;
      const minPax  = expType?.min_participants ?? 4;
      const expName = expType?.name ?? "茶藝體驗";

      const { data: bookings } = await supabase
        .from("experience_bookings")
        .select("id, user_id, booker_name, booker_email, participant_count, total_price")
        .eq("session_id", session.id)
        .eq("status", "confirmed");

      if (!bookings || bookings.length === 0) continue;

      const totalPax = bookings.reduce((s, b) => s + b.participant_count, 0);

      if (totalPax >= minPax) {
        // ── 確認開課 ──
        for (const booking of bookings) {
          try {
            await sendSessionConfirmEmail({
              bookerName:       booking.booker_name,
              bookerEmail:      booking.booker_email,
              experienceName:   expName,
              sessionDate:      session.session_date,
              startTime:        session.start_time,
              participantCount: booking.participant_count,
              totalPrice:       booking.total_price,
            });
            results.confirmOrCancel.confirmed++;
          } catch {
            results.confirmOrCancel.errors++;
          }
        }
      } else {
        // ── 取消場次 ──
        // 更新 session 狀態
        await supabase
          .from("experience_sessions")
          .update({ status: "cancelled", cancel_reason: "報名人數未達開課門檻" })
          .eq("id", session.id);

        // 取消所有預約
        const bookingIds = bookings.map(b => b.id);
        await supabase
          .from("experience_bookings")
          .update({
            status:              "cancelled",
            cancelled_at:        new Date().toISOString(),
            cancellation_reason: "活動人數未達開課門檻，系統自動取消",
            refund_status:       "pending",
            refund_amount:       null, // 全額退
          })
          .in("id", bookingIds);

        // 退還折抵點數。場次是店家因人數不足取消的，客人無過失，
        // 不套用距活動時間的退款比例，一律全額退（refundRate = 1）
        for (const booking of bookings) {
          if (!booking.user_id) continue;
          await refundBookingPoints({
            userId:      booking.user_id,
            bookingId:   booking.id,
            refundRate:  1,
            description: "場次取消退還點數",
          }).catch(err => {
            console.error(`[cron] 場次取消退點失敗 booking ${booking.id}:`, err);
            results.confirmOrCancel.errors++;
          });
        }

        const totalRefund = bookings.reduce((s, b) => s + b.total_price, 0);

        // 寄給所有預約者
        for (const booking of bookings) {
          try {
            await sendSessionCancelEmail({
              bookerName:     booking.booker_name,
              bookerEmail:    booking.booker_email,
              experienceName: expName,
              sessionDate:    session.session_date,
              startTime:      session.start_time,
              totalPrice:     booking.total_price,
            });
            results.confirmOrCancel.cancelled++;
          } catch {
            results.confirmOrCancel.errors++;
          }
        }

        // 管理者通知
        await sendAdminSessionCancelNotice({
          experienceName:        expName,
          sessionDate:           session.session_date,
          startTime:             session.start_time,
          cancelledBookingCount: bookings.length,
          totalRefundAmount:     totalRefund,
        }).catch(() => null);
      }
    }
  }

  // ── 3. 1天前：活動提醒 ────────────────────────────────────────────────────
  const date1 = targetDate(1);
  const { data: sessions1 } = await supabase
    .from("experience_sessions")
    .select("id, session_date, start_time, experience_types(name)")
    .eq("session_date", date1)
    .neq("status", "cancelled");

  if (sessions1) {
    for (const session of sessions1) {
      const expName = (session.experience_types as unknown as { name: string } | null)?.name ?? "茶藝體驗";

      const { data: bookings } = await supabase
        .from("experience_bookings")
        .select("id, booker_name, booker_email, participant_count")
        .eq("session_id", session.id)
        .eq("status", "confirmed");

      if (!bookings) continue;

      for (const booking of bookings) {
        try {
          await sendDayBeforeReminder({
            bookerName:       booking.booker_name,
            bookerEmail:      booking.booker_email,
            experienceName:   expName,
            sessionDate:      session.session_date,
            startTime:        session.start_time,
            participantCount: booking.participant_count,
          });
          results.dayBefore.sent++;
        } catch {
          results.dayBefore.errors++;
        }
      }
    }
  }

  // ── 4. 清理過期候補，通知下一位 ───────────────────────────────────────────────
  await expireWaitlistAndNotifyNext().catch(console.error);

  // ── 5. 待退款對帳：現金退款是純人工，沒人提醒就會躺著 ─────────────────────────
  const PENDING_REFUND_DAYS = 3;
  const refundCutoff = new Date(Date.now() - PENDING_REFUND_DAYS * 24 * 60 * 60 * 1000);

  const { data: pendingRefunds } = await supabase
    .from("experience_bookings")
    .select("id, booker_name, cancelled_at, refund_amount, total_price, session:experience_sessions(experience_types(name))")
    .eq("refund_status", "pending")
    .lt("cancelled_at", refundCutoff.toISOString())
    .order("cancelled_at", { ascending: true });

  if (pendingRefunds && pendingRefunds.length > 0) {
    await sendAdminPendingRefundDigest({
      items: pendingRefunds.map(b => ({
        bookingId:      b.id,
        bookerName:     b.booker_name,
        experienceName: (b.session as unknown as { experience_types?: { name: string } } | null)
                          ?.experience_types?.name ?? "茶藝體驗",
        cancelledAt:    b.cancelled_at,
        refundAmount:   b.refund_amount,
        totalPrice:     b.total_price,
        daysPending:    Math.floor(
                          (Date.now() - new Date(b.cancelled_at).getTime()) / (24 * 60 * 60 * 1000)
                        ),
      })),
    }).catch(console.error);
  }

  console.log("Experience reminders cron result:", results);
  return NextResponse.json({ ok: true, results });
}
