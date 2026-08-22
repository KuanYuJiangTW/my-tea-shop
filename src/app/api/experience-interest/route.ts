import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sendExperienceInterestEmail } from "@/lib/email";

/**
 * POST /api/experience-interest — 「找不到適合的日期」的需求登記。
 *
 * 這是客製開課請求的 **Phase 0**：只收訊號，不做審核工作流。沒有狀態機、
 * 沒有 token、沒有排程。防濫用整套沿用 `web-inquiry`（限流＋honeypot＋
 * 白名單＋service_role 寫入＋best-effort 通知信），那組已經在線上跑過。
 *
 * body: { experienceTypeId, contactEmail?, contactLine?, preferredDate?,
 *         headcount?, note?, source?, locale?, website(honeypot) }
 */

const MAX_PER_IP = 10;
const WINDOW_MS  = 60 * 60_000;   // 1 小時

const VALID_SOURCES = ["no-date", "off-season"];
const VALID_LOCALES = ["zh", "en"];

/** DB 的 unique index 擋下重複登記時的錯誤碼 */
const UNIQUE_VIOLATION = "23505";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`experience-interest:${ip}`, MAX_PER_IP, WINDOW_MS))) {
    return NextResponse.json({ error: "傳送過於頻繁，請稍後再試" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });

  // honeypot：隱藏欄位有值＝機器人，靜默丟棄（仍回 200，不寫庫不寄信）
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const {
    experienceTypeId, contactEmail, contactLine,
    preferredDate, headcount, note, source, locale,
  } = body;

  if (!Number.isInteger(experienceTypeId)) {
    return NextResponse.json({ error: "缺少體驗類型" }, { status: 400 });
  }

  const email = typeof contactEmail === "string" ? contactEmail.trim() : "";
  const line  = typeof contactLine  === "string" ? contactLine.trim()  : "";
  if (!email && !line) {
    return NextResponse.json({ error: "Email 或 LINE 至少留一個，我們才通知得到你" }, { status: 400 });
  }
  if (email.length > 200 || line.length > 100) {
    return NextResponse.json({ error: "聯絡方式過長" }, { status: 400 });
  }
  // 只做基本形狀檢查——過嚴的 email 正則擋掉真人的機率比擋掉機器人高
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "請填寫正確的 Email" }, { status: 400 });
  }

  if (preferredDate !== undefined && preferredDate !== null && preferredDate !== "") {
    if (typeof preferredDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
      return NextResponse.json({ error: "日期格式不正確" }, { status: 400 });
    }
  }

  if (headcount !== undefined && headcount !== null && headcount !== "") {
    if (!Number.isInteger(headcount) || headcount < 1 || headcount > 50) {
      return NextResponse.json({ error: "人數不正確" }, { status: 400 });
    }
  }

  if (note !== undefined && note !== null && (typeof note !== "string" || note.length > 500)) {
    return NextResponse.json({ error: "備註過長" }, { status: 400 });
  }

  const safeSource = VALID_SOURCES.includes(source) ? source : "no-date";
  const safeLocale = VALID_LOCALES.includes(locale) ? locale : "zh";

  const { error } = await supabase.from("experience_interest").insert({
    experience_type_id: experienceTypeId,
    contact_email:      email || null,
    contact_line:       line  || null,
    preferred_date:     preferredDate || null,
    headcount:          typeof headcount === "number" ? headcount : null,
    note:               typeof note === "string" && note.trim() ? note.trim() : null,
    source:             safeSource,
    locale:             safeLocale,
  });

  if (error) {
    // 重複登記不是錯誤，對客人來說「我登記過了」跟「登記成功」是同一件事。
    // 回 200 才不會讓人以為沒送出而一直重按
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[experience-interest] insert failed:", error);
    return NextResponse.json({ error: "登記失敗，請稍後再試" }, { status: 500 });
  }

  // best-effort 通知業主：寄信失敗不影響已落庫的成功回應
  try {
    const { data: expType } = await supabase
      .from("experience_types")
      .select("name")
      .eq("id", experienceTypeId)
      .single();

    await sendExperienceInterestEmail({
      experienceName: expType?.name ?? `#${experienceTypeId}`,
      contactEmail:   email || undefined,
      contactLine:    line  || undefined,
      preferredDate:  preferredDate || undefined,
      headcount:      typeof headcount === "number" ? headcount : undefined,
      note:           typeof note === "string" && note.trim() ? note.trim() : undefined,
      source:         safeSource,
    });
  } catch (err) {
    console.error("[experience-interest] sendExperienceInterestEmail failed:", err);
  }

  return NextResponse.json({ ok: true });
}
