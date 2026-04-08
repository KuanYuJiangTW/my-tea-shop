import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sanity-webhook-secret");
  if (!secret || secret !== process.env.SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 清除所有體驗相關頁面快取
  revalidatePath("/experiences");
  revalidatePath("/experiences/[slug]", "page");

  return NextResponse.json({ revalidated: true });
}
