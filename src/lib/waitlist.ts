import { supabase } from "@/lib/supabase";
import { sendWaitlistNotifyEmail } from "@/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

/**
 * 取消預約後呼叫，通知下一位符合人數的候補者。
 * 採先進先出、找到第一個 participant_count <= freedSlots 的記錄。
 */
export async function notifyNextWaitlist(sessionId: string, freedSlots: number) {
  // 查詢候補中的記錄（waiting，按報名時間排序）
  const { data: entries } = await supabase
    .from("waitlist_entries")
    .select("id, booker_name, booker_email, participant_count, experience_sessions(session_date, start_time, experience_types(name))")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .order("created_at", { ascending: true });

  if (!entries || entries.length === 0) return;

  // 找到第一個可以容納的候補者
  const next = entries.find(e => e.participant_count <= freedSlots);
  if (!next) return;

  const deadline     = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小時後
  const confirmUrl   = `${BASE_URL}/waitlist/${next.id}/confirm`;
  const deadlineLabel = deadline.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const session     = next.experience_sessions as unknown as { session_date: string; start_time: string; experience_types: { name: string } | null } | null;
  const expName     = session?.experience_types?.name ?? "茶藝體驗";
  const sessionDate = session?.session_date ?? "";
  const startTime   = session?.start_time   ?? "";

  // 更新狀態
  await supabase
    .from("waitlist_entries")
    .update({
      status:           "notified",
      notified_at:      new Date().toISOString(),
      confirm_deadline: deadline.toISOString(),
    })
    .eq("id", next.id);

  // 寄通知信（fire-and-forget）
  sendWaitlistNotifyEmail({
    waitlistId:     next.id,
    bookerName:     next.booker_name,
    bookerEmail:    next.booker_email,
    experienceName: expName,
    sessionDate,
    startTime,
    confirmUrl,
    deadlineLabel,
  }).catch(console.error);
}

/**
 * Cron 清理：將已過 confirm_deadline 的 notified 紀錄標為 expired，
 * 並通知下一位候補者。
 */
export async function expireWaitlistAndNotifyNext() {
  const { data: expired } = await supabase
    .from("waitlist_entries")
    .select("id, session_id, participant_count")
    .eq("status", "notified")
    .lt("confirm_deadline", new Date().toISOString());

  if (!expired || expired.length === 0) return;

  for (const entry of expired) {
    await supabase
      .from("waitlist_entries")
      .update({ status: "expired" })
      .eq("id", entry.id);

    // 通知下一位
    await notifyNextWaitlist(entry.session_id, entry.participant_count);
  }
}
