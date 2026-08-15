import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkIntRange, checkText, firstError, MAX_TEXT_LEN } from "@/lib/validate";
import { orderContainsProduct } from "@/lib/product-review-core";

/**
 * 站內留評（階段二）。比照 `POST /api/reviews`（體驗端）的已購驗證，
 * 只是這裡的憑據是訂單而不是預約。
 *
 * 三道驗證缺一不可，順序也有意義：
 *   1. 訂單屬本人（403）——拿別人的訂單號留評
 *   2. `order_status = completed`（409）——沒出貨就評等於沒喝過
 *   3. 訂單真的含這款茶（409）——**最容易被漏掉的一道**：有一筆已完成訂單的人
 *      可以拿它去評所有商品。這道沒了，整套已購驗證形同虛設
 *
 * `source` 一律寫 `site`，忽略請求帶入的值——不讓人從這裡偽造「來自 LINE」。
 */
export async function POST(req: NextRequest) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }

  const { orderId, productId, rating, comment } = body as {
    orderId?: unknown; productId?: unknown; rating?: unknown; comment?: unknown;
  };

  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }

  const err = firstError(
    checkIntRange(productId, "商品", 1, Number.MAX_SAFE_INTEGER, true),
    checkIntRange(rating, "評分", 1, 5, true),
    checkText(comment, "評論內容", { max: MAX_TEXT_LEN }),
  );
  if (err) {
    return NextResponse.json({ error: "參數錯誤", detail: err }, { status: 400 });
  }

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, user_id, order_status, items")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "找不到此訂單" }, { status: 404 });
  }

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  if (order.order_status !== "completed") {
    return NextResponse.json({ error: "訂單尚未完成，無法留評" }, { status: 409 });
  }

  if (!orderContainsProduct(order.items, productId as number)) {
    return NextResponse.json({ error: "這筆訂單沒有這項商品" }, { status: 409 });
  }

  const { data: review, error: insertError } = await supabase
    .from("product_reviews")
    .insert({
      product_id: productId as number,
      order_id:   orderId,
      user_id:    user.id,
      rating:     rating as number,
      comment:    typeof comment === "string" && comment.trim() ? comment.trim() : null,
      // 每訂單每商品限一則是 DB 的 UNIQUE 在守，不是這裡先 select 再 insert——
      // 那種寫法在併發下擋不住（兩個請求都查到「沒有」）
      source:     "site",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "您已經評價過這項商品" }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  revalidatePath("/products");
  revalidatePath("/en/products");

  return NextResponse.json({ id: review.id });
}
