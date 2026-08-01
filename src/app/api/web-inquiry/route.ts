import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWebInquiryEmail } from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// POST /api/web-inquiry — 風土數位報價頁（/web-design）諮詢表單
// body: {
//   referralSource, industryBrand, painPoints[], budgetRange, timeline,
//   contactName, contactLine?, contactEmail?, contactTime?, locale, website (honeypot)
// }

// ─── Rate Limiter（持久化，防垃圾諮詢轟炸）────────────────────────────────────
const MAX_INQUIRY = 5;
const INQUIRY_WINDOW_MS = 60 * 60_000; // 1 小時

// ─── 白名單（防任意字串灌入 DB／email 樣板）───────────────────────────────────
const VALID_REFERRAL_SOURCES = ["site", "referral", "search", "social", "other"];
const VALID_PAIN_POINTS = ["noWebsite", "oldWebsite", "onlineOrders", "booking", "seo", "other"];
const VALID_BUDGET_RANGES = ["under50k", "50to150k", "150to300k", "over300k", "undecided"];
const VALID_TIMELINES = ["within1m", "within3m", "evaluating"];
const VALID_LOCALES = ["zh", "en"];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`web-inquiry:${ip}`, MAX_INQUIRY, INQUIRY_WINDOW_MS))) {
    return NextResponse.json({ error: "傳送過於頻繁，請稍後再試" }, { status: 429 });
  }

  const body = await req.json();

  // honeypot：隱藏欄位有值 → 判定為機器人，靜默丟棄（仍回 200，不寫庫不寄信）
  if (typeof body?.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const {
    referralSource,
    industryBrand,
    painPoints,
    budgetRange,
    timeline,
    contactName,
    contactLine,
    contactEmail,
    contactTime,
    locale,
  } = body ?? {};

  // ─── 必填欄位 ───────────────────────────────────────────────────────────────
  if (!referralSource || !industryBrand || !budgetRange || !timeline || !contactName) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }
  if (typeof contactName !== "string" || !contactName.trim()) {
    return NextResponse.json({ error: "請告訴我們怎麼稱呼你" }, { status: 400 });
  }
  const trimmedLine  = typeof contactLine === "string"  ? contactLine.trim()  : "";
  const trimmedEmail = typeof contactEmail === "string" ? contactEmail.trim() : "";
  if (!trimmedLine && !trimmedEmail) {
    return NextResponse.json({ error: "LINE 或 Email 至少留一個，我們才找得到你" }, { status: 400 });
  }

  // ─── 長度限制 ───────────────────────────────────────────────────────────────
  if (typeof industryBrand !== "string" || industryBrand.length > 200) {
    return NextResponse.json({ error: "產業與品牌名稱過長" }, { status: 400 });
  }
  if (contactName.length > 100) {
    return NextResponse.json({ error: "姓名過長" }, { status: 400 });
  }
  if (trimmedLine.length > 100 || trimmedEmail.length > 200) {
    return NextResponse.json({ error: "聯絡方式過長" }, { status: 400 });
  }
  if (contactTime !== undefined && contactTime !== null) {
    if (typeof contactTime !== "string" || contactTime.length > 200) {
      return NextResponse.json({ error: "方便聯絡時段過長" }, { status: 400 });
    }
  }

  // ─── 白名單驗證（單選）──────────────────────────────────────────────────────
  if (!VALID_REFERRAL_SOURCES.includes(referralSource)) {
    return NextResponse.json({ error: "無效的認識管道" }, { status: 400 });
  }
  if (!VALID_BUDGET_RANGES.includes(budgetRange)) {
    return NextResponse.json({ error: "無效的預算區間" }, { status: 400 });
  }
  if (!VALID_TIMELINES.includes(timeline)) {
    return NextResponse.json({ error: "無效的上線時程" }, { status: 400 });
  }

  // ─── 白名單驗證（複選）──────────────────────────────────────────────────────
  const painPointsList: unknown[] = Array.isArray(painPoints) ? painPoints : [];
  if (!painPointsList.every((p) => typeof p === "string" && VALID_PAIN_POINTS.includes(p))) {
    return NextResponse.json({ error: "無效的痛點選項" }, { status: 400 });
  }

  // ─── locale（選填，預設 zh）─────────────────────────────────────────────────
  const safeLocale = VALID_LOCALES.includes(locale) ? locale : "zh";

  const { error } = await supabase
    .from("web_inquiries")
    .insert({
      referral_source: referralSource,
      industry_brand:  industryBrand.trim(),
      pain_points:      painPointsList,
      budget_range:     budgetRange,
      timeline:          timeline,
      contact_name:      contactName.trim(),
      contact_line:      trimmedLine || null,
      contact_email:     trimmedEmail || null,
      contact_time:      typeof contactTime === "string" && contactTime.trim() ? contactTime.trim() : null,
      locale:            safeLocale,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ─── best-effort 寄信：失敗只 log，不影響已落庫的成功回應 ─────────────────────
  try {
    await sendWebInquiryEmail({
      referralSource,
      industryBrand: industryBrand.trim(),
      painPoints:    painPointsList as string[],
      budgetRange,
      timeline,
      contactName:   contactName.trim(),
      contactLine:   trimmedLine || undefined,
      contactEmail:  trimmedEmail || undefined,
      contactTime:   typeof contactTime === "string" && contactTime.trim() ? contactTime.trim() : undefined,
      locale:        safeLocale,
    });
  } catch (err) {
    console.error("[web-inquiry] sendWebInquiryEmail failed:", err);
  }

  return NextResponse.json({ ok: true });
}
