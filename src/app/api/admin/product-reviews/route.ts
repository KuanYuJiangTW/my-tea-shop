import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { validateNewProductReview } from "@/lib/product-review-core";

/**
 * 後台手動建檔商品評價（階段一的主要入口）。
 *
 * 為什麼要有這支：真實已付款訂單只有 6 筆、3 個客人，等自然評價累積要很久，
 * 但業主手上已經有 LINE 與 FB 的既有好評。這支讓那些口碑上得了架。
 *
 * `source` 必填且驗證列舉——手動建檔一律不是 `site`，前台會標明來源。
 * 站內投稿要等階段二的 `POST /api/product-reviews`（含已購驗證）。
 */
export const POST = withAdminAuth(async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "參數錯誤", detail: "請求格式不正確" }, { status: 400 });
  }

  const parsed = validateNewProductReview(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "參數錯誤", detail: parsed.error }, { status: 400 });
  }

  const { reviewed_at, ...rest } = parsed.value;
  const { data, error } = await supabase
    .from("product_reviews")
    // reviewed_at 沒填就交給 DB 的 default current_date，不要塞 null（欄位是 NOT NULL）
    .insert(reviewed_at ? { ...rest, reviewed_at } : rest)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // /products 是 ISR（revalidate 3600），不清快取的話新評價要等一小時才看得到
  revalidatePath("/products");
  revalidatePath("/en/products");

  return NextResponse.json({ id: data.id });
}, "create_product_review");
