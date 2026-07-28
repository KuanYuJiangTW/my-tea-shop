import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifySanityWebhook } from "@/lib/sanity-webhook";

export async function POST(req: NextRequest) {
  // 需要原始 body 才能驗簽，故不可先 req.json()
  const rawBody = await req.text();

  const result = verifySanityWebhook(
    rawBody,
    req.headers.get("sanity-webhook-signature"),
    req.headers.get("x-sanity-webhook-secret"),
    process.env.SANITY_WEBHOOK_SECRET,
  );

  if (!result.ok) {
    console.warn("[sanity-webhook] 驗證失敗:", result.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (result.method === "legacy-secret") {
    // 待 Sanity 後台改用 Secret 簽章（HMAC）後，即可刪除 lib 內的退路分支
    console.warn("[sanity-webhook] 仍使用舊版共用密鑰驗證，請於 Sanity 後台啟用簽章");
  }

  // 清除所有取用 Sanity 內容的頁面快取
  // （體驗內容出現在首頁與製茶頁；FAQ 頁的 FAQPage JSON-LD 也吃 Sanity）
  revalidatePath("/experiences");
  revalidatePath("/experiences/[slug]", "page");
  revalidatePath("/faq");
  revalidatePath("/");
  revalidatePath("/process");

  return NextResponse.json({ revalidated: true, auth: result.method });
}
