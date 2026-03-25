import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, subject, message } = body ?? {};

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  try {
    await sendContactEmail({ name, email, subject, message });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] sendContactEmail failed:", err);
    return NextResponse.json({ error: "寄信失敗，請稍後再試" }, { status: 500 });
  }
}
