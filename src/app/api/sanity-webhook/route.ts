import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { verifySanityWebhook } from "@/lib/sanity-webhook";
import { SANITY_CACHE_TAG } from "@/sanity/client";

/**
 * 吃 Sanity 內容的路由。清這些路徑是為了 full route cache；
 * 動態渲染的頁面（本站因 middleware 的 nonce CSP 幾乎全是）沒有 route cache，
 * 真正卡住的是 fetch data cache，那要靠 SANITY_CACHE_TAG 清。兩層都要。
 */
const SANITY_PATHS = [
  "/",
  "/experiences",
  "/process",
  "/faq",
  "/tea-guide",       // 列表頁：先前漏掉，ALL_ARTICLES_QUERY 常常是由它寫進快取的
  "/sitemap.xml",
] as const;

const SANITY_DYNAMIC_PATHS = [
  "/experiences/[slug]",
  "/tea-guide/[slug]",
] as const;

export async function POST(req: NextRequest) {
  // 需要原始 body 才能驗簽，故不可先 req.json()
  const rawBody = await req.text();

  const result = verifySanityWebhook(
    rawBody,
    req.headers.get("sanity-webhook-signature"),
    process.env.SANITY_WEBHOOK_SECRET,
  );

  if (!result.ok) {
    // 這行是排查時唯一的線索：Sanity manage 後台只看得到 401，看不到原因。
    console.warn("[sanity-webhook] 驗證失敗:", result.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 先清 tag——這是動態渲染頁唯一吃得到的一層
  revalidateTag(SANITY_CACHE_TAG, { expire: 0 });

  for (const path of SANITY_PATHS)         revalidatePath(path);
  for (const path of SANITY_DYNAMIC_PATHS) revalidatePath(path, "page");

  // 留一行成功紀錄，讓「webhook 有沒有真的送到」在 Vercel log 可查
  console.log("[sanity-webhook] 已清除快取 tag=%s paths=%d", SANITY_CACHE_TAG,
    SANITY_PATHS.length + SANITY_DYNAMIC_PATHS.length);

  return NextResponse.json({ revalidated: true, tag: SANITY_CACHE_TAG });
}
