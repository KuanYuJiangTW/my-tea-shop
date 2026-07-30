import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifySanityWebhook } from "@/lib/sanity-webhook";

export async function POST(req: NextRequest) {
  // 需要原始 body 才能驗簽，故不可先 req.json()
  const rawBody = await req.text();

  const result = verifySanityWebhook(
    rawBody,
    req.headers.get("sanity-webhook-signature"),
    process.env.SANITY_WEBHOOK_SECRET,
  );

  if (!result.ok) {
    console.warn("[sanity-webhook] 驗證失敗:", result.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 清除所有取用 Sanity 內容的頁面快取
  // （體驗內容出現在首頁與製茶頁；FAQ 頁的 FAQPage JSON-LD 也吃 Sanity）
  revalidatePath("/experiences");
  revalidatePath("/experiences/[slug]", "page");
  revalidatePath("/faq");
  revalidatePath("/");
  revalidatePath("/process");

  return NextResponse.json({ revalidated: true });
}
