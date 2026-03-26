import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";

// ─── Rate Limiter（防止垃圾信轟炸管理員信箱）────────────────────────────────
const MAX_CONTACT = 5;
const CONTACT_WINDOW_MS = 60 * 60_000; // 1 小時
type ContactRecord = { count: number; resetAt: number };
const contactMap = new Map<string, ContactRecord>();

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

function isContactRateLimited(ip: string): boolean {
  const now = Date.now();
  const r = contactMap.get(ip);
  if (!r) return false;
  if (r.resetAt <= now) { contactMap.delete(ip); return false; }
  return r.count >= MAX_CONTACT;
}

function recordContact(ip: string): void {
  const now = Date.now();
  const r = contactMap.get(ip);
  if (r && r.resetAt > now) r.count += 1;
  else contactMap.set(ip, { count: 1, resetAt: now + CONTACT_WINDOW_MS });
}

// ─── 合法 subject 白名單 ──────────────────────────────────────────────────────
const VALID_SUBJECTS = ["product", "order", "wholesale", "visit", "other"];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isContactRateLimited(ip)) {
    return NextResponse.json({ error: "傳送過於頻繁，請稍後再試" }, { status: 429 });
  }

  const body = await req.json();
  const { name, email, subject, message } = body ?? {};

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  // 長度限制
  if (typeof name !== "string"    || name.length    > 100)   return NextResponse.json({ error: "姓名過長" },     { status: 400 });
  if (typeof email !== "string"   || email.length   > 200)   return NextResponse.json({ error: "Email 過長" },   { status: 400 });
  if (typeof message !== "string" || message.length > 2000)  return NextResponse.json({ error: "訊息過長" },     { status: 400 });

  // Email 格式驗證（防止 header injection）
  const EMAIL_RE = /^[^\s@<>,"]+@[^\s@<>,"]+\.[^\s@<>,"]+$/;
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email 格式不正確" }, { status: 400 });
  }

  // subject 白名單（防止直接插入任意字串進 email 模板）
  if (!VALID_SUBJECTS.includes(subject)) {
    return NextResponse.json({ error: "無效的主旨類型" }, { status: 400 });
  }

  recordContact(ip);

  try {
    await sendContactEmail({ name, email, subject, message });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] sendContactEmail failed:", err);
    return NextResponse.json({ error: "寄信失敗，請稍後再試" }, { status: 500 });
  }
}
