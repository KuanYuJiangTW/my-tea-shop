import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// PATCH /api/admin/reviews/[id]?type=product|experience
// body: { is_visible: boolean }
//
// 體驗與商品的評價審核做的事完全相同（切 is_visible），所以共用這一支而不是
// 另開一條路由（design.md D6）。`type` 未帶時預設 `experience`——既有的體驗
// 評價後台頁不必改就仍走原路徑。
const TABLES = {
  experience: "experience_reviews",
  product:    "product_reviews",
} as const;

type ReviewType = keyof typeof TABLES;

export const PATCH = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const type = (req.nextUrl.searchParams.get("type") ?? "experience") as ReviewType;
  if (!(type in TABLES)) {
    return NextResponse.json({ error: "type 必須是 product 或 experience" }, { status: 400 });
  }

  const { is_visible } = await req.json();
  if (typeof is_visible !== "boolean") {
    return NextResponse.json({ error: "is_visible 必須是布林值" }, { status: 400 });
  }

  const { error } = await supabase
    .from(TABLES[type])
    .update({ is_visible })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 商品評價顯示在 ISR 的 /products 上，下架後要立即從前台消失
  if (type === "product") {
    revalidatePath("/products");
    revalidatePath("/en/products");
  }

  return NextResponse.json({ ok: true });
}, "update_review");
