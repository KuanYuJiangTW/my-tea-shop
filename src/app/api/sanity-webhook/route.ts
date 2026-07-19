import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sanity-webhook-secret");
  if (!secret || secret !== process.env.SANITY_WEBHOOK_SECRET) {
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
