import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as adminSupabase } from "@/lib/supabase";

const CANCELLABLE_STATUSES = ["new"];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 驗證登入狀態
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  // 確認訂單屬於此會員
  const { data: order, error: fetchError } = await adminSupabase
    .from("orders")
    .select("id, user_id, order_status, coupon_id, points_used, items, payment_method, payment_status")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
  }

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "無權限操作此訂單" }, { status: 403 });
  }

  if (!CANCELLABLE_STATUSES.includes(order.order_status)) {
    return NextResponse.json(
      { error: "此訂單狀態無法取消，若有需要請聯絡客服" },
      { status: 400 }
    );
  }

  const { error } = await adminSupabase
    .from("orders")
    .update({ order_status: "cancelled" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "取消失敗，請稍後再試" }, { status: 500 });
  }

  // 還原庫存
  // COD: 下單即扣庫存 → 取消需還原
  // ECPay / PayPal / Stripe: 付款成功後才扣庫存 → 只有 paid 才需還原
  const shouldRestoreStock =
    order.payment_method === "cod" || order.payment_status === "paid";

  if (shouldRestoreStock && Array.isArray(order.items)) {
    const orderItems = order.items as { productId: number; quantity: number; spec: string }[];
    await Promise.all(
      orderItems.map((item) =>
        adminSupabase.rpc("increment_stock", {
          p_id: item.productId,
          qty:  item.quantity,
          spec: item.spec ?? "150g",
        })
      )
    );
  }

  // 還原折價券
  if (order.coupon_id) {
    await adminSupabase
      .from("coupons")
      .update({ used_at: null, order_id: null })
      .eq("id", order.coupon_id);
  }

  // 還原已扣除的點數
  if (order.points_used > 0) {
    await adminSupabase.from("point_transactions").insert({
      user_id:     user.id,
      points:      order.points_used,
      type:        "earn",
      order_id:    id,
      description: "訂單取消退還點數",
    });
  }

  return NextResponse.json({ ok: true });
}
