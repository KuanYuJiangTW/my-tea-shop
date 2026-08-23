import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sendRequestReceivedEmail, sendAdminRequestNoticeEmail } from "@/lib/email";
import {
  CONTACT_PREFERENCE_WHITELIST,
  calcRequestSlots,
  calcRequestTotal,
  generateRequestNo,
  generateRequestToken,
  isAllowedStartTime,
  isRequestableDate,
} from "@/lib/experience-requests";

/**
 * POST /api/experience-requests — 建立客製開課請求。
 *
 * **免登入即可提交**（design.md D2）：要求登入會砍掉可觀的送出量，而這個
 * 功能的價值正是捕捉那些原本會直接關掉分頁的人。付款階段才需要登入——
 * 那是既有預約流程本來就擋的。
 *
 * 防濫用沿用 web-inquiry：限流＋honeypot＋白名單＋service_role 寫入。
 */

const MAX_PER_IP = 5;
const WINDOW_MS  = 60 * 60_000;

const VALID_LOCALES = ["zh", "en"];
const UNIQUE_VIOLATION = "23505";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`experience-request:${ip}`, MAX_PER_IP, WINDOW_MS))) {
    return NextResponse.json({ error: "傳送過於頻繁，請稍後再試" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });

  // honeypot：靜默丟棄，回 200 才不會讓機器人知道自己被擋
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const {
    experienceTypeId, preferredDate, preferredStartTime, altDate, altStartTime,
    headcount, isPrivate, contactName, contactPhone, contactEmail, contactLine,
    contactPreference, contactTime, note, locale,
  } = body;

  // ─── 必填 ───────────────────────────────────────────────────────────────
  if (!Number.isInteger(experienceTypeId) || !preferredDate || !preferredStartTime) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  const name  = typeof contactName  === "string" ? contactName.trim()  : "";
  const phone = typeof contactPhone === "string" ? contactPhone.trim() : "";
  const email = typeof contactEmail === "string" ? contactEmail.trim() : "";
  if (!name || !phone || !email) {
    return NextResponse.json({ error: "請填寫姓名、電話與 Email" }, { status: 400 });
  }
  if (name.length > 100 || phone.length > 50 || email.length > 200) {
    return NextResponse.json({ error: "聯絡資訊過長" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "請填寫正確的 Email" }, { status: 400 });
  }

  if (!Number.isInteger(headcount) || headcount < 1 || headcount > 50) {
    return NextResponse.json({ error: "參加人數不正確" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return NextResponse.json({ error: "日期格式不正確" }, { status: 400 });
  }
  if (contactPreference !== undefined && contactPreference !== null && contactPreference !== "" &&
      !CONTACT_PREFERENCE_WHITELIST.includes(contactPreference)) {
    return NextResponse.json({ error: "無效的聯絡方式偏好" }, { status: 400 });
  }
  if (note !== undefined && note !== null && (typeof note !== "string" || note.length > 500)) {
    return NextResponse.json({ error: "備註過長" }, { status: 400 });
  }

  // ─── 這款體驗開放請求嗎、參數是什麼 ─────────────────────────────────────
  const { data: type, error: typeError } = await supabase
    .from("experience_types")
    .select("*, experience_availability_windows(start_date, end_date)")
    .eq("id", experienceTypeId)
    .eq("is_active", true)
    .single();

  if (typeError || !type) {
    return NextResponse.json({ error: "找不到此體驗" }, { status: 404 });
  }
  if (!type.accepts_requests) {
    return NextResponse.json({ error: "此體驗目前不開放客製開課申請" }, { status: 409 });
  }

  const shape = {
    price:             type.price as number,
    maxParticipants:   type.max_participants as number,
    requestMinSlots:   type.request_min_slots as number | null,
    requestLeadDays:   type.request_lead_days as number | null,
    requestStartTimes: type.request_start_times as string[] | undefined,
  };

  if (!isAllowedStartTime(shape, preferredStartTime)) {
    return NextResponse.json({ error: "這個時段不開放申請" }, { status: 400 });
  }

  const { data: blackouts } = await supabase
    .from("experience_blackout_dates")
    .select("blackout_date");

  const windows = ((type.experience_availability_windows ?? []) as { start_date: string; end_date: string }[])
    .map(w => ({ startDate: w.start_date, endDate: w.end_date }));

  const check = isRequestableDate(preferredDate, {
    leadDays: shape.requestLeadDays,
    blackoutDates: (blackouts ?? []).map(b => b.blackout_date as string),
    windows,
  });
  if (!check.ok) {
    const messages: Record<string, string> = {
      "too-soon":      "這個日期太趕了，備料與人力調度來不及。請改用 LINE 或電話直接聯絡我們",
      "too-far":       "目前只接受三個月內的日期",
      "blackout":      "這天我們公休，請換一天",
      "out-of-season": "這段期間不是這個體驗的開放季節",
    };
    return NextResponse.json({ error: messages[check.reason] ?? "這個日期無法申請", reason: check.reason }, { status: 400 });
  }

  // ─── 登入的話把 user_id 記上（不是必要條件）──────────────────────────────
  let userId: string | null = null;
  try {
    const sb = await createSupabaseServerClient();
    const { data: { user } } = await sb.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* 未登入，維持 null */ }

  const slots = calcRequestSlots(shape, headcount);
  const total = calcRequestTotal(shape, slots);

  const { data: created, error } = await supabase
    .from("experience_requests")
    .insert({
      request_no:           generateRequestNo(),
      experience_type_id:   experienceTypeId,
      preferred_date:       preferredDate,
      preferred_start_time: preferredStartTime,
      alt_date:             altDate || null,
      alt_start_time:       altStartTime || null,
      headcount,
      is_private:           isPrivate === true,
      contact_name:         name,
      contact_phone:        phone,
      contact_email:        email,
      contact_line:         typeof contactLine === "string" && contactLine.trim() ? contactLine.trim() : null,
      contact_preference:   contactPreference || null,
      contact_time:         typeof contactTime === "string" && contactTime.trim() ? contactTime.trim() : null,
      note:                 typeof note === "string" && note.trim() ? note.trim() : null,
      user_id:              userId,
      locale:               VALID_LOCALES.includes(locale) ? locale : "zh",
      token:                generateRequestToken(),
    })
    .select("id, request_no, token")
    .single();

  if (error) {
    // 同一 Email 對同一體驗＋日期＋時段重複送出（DB 的 partial unique index）
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: "你已經送出過同一天的申請了，我們會盡快回覆" }, { status: 409 });
    }
    console.error("[experience-requests] insert failed:", error);
    return NextResponse.json({ error: "送出失敗，請稍後再試" }, { status: 500 });
  }

  // best-effort：寄信失敗不影響已落庫的申請
  const emailPayload = {
    requestNo:      created.request_no as string,
    token:          created.token as string,
    experienceName: type.name as string,
    preferredDate,
    preferredStartTime,
    headcount,
    slots,
    total,
    contactName: name,
    contactPhone: phone,
    contactEmail: email,
    locale: VALID_LOCALES.includes(locale) ? locale : "zh",
  };
  try { await sendRequestReceivedEmail(emailPayload); }
  catch (err) { console.error("[experience-requests] sendRequestReceivedEmail failed:", err); }
  try { await sendAdminRequestNoticeEmail(emailPayload); }
  catch (err) { console.error("[experience-requests] sendAdminRequestNoticeEmail failed:", err); }

  return NextResponse.json({
    requestNo: created.request_no,
    token:     created.token,
    slots,
    total,
  });
}
