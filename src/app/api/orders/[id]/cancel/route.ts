import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as adminSupabase } from "@/lib/supabase";
import { refundOrderPoints } from "@/lib/points";
import { isBundleOrderItem, restoreBundleStock } from "@/lib/order-bundles";

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
    .select("id, user_id, order_status, coupon_id, points_used, points_discount, items, payment_method, payment_status")
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItems = order.items as any[];
    await Promise.all(
      orderItems.map((item) => {
        // 組合要依**下單當時的成分快照**回補，不是依目前的成分設定——
        // 成分被改過的話，照現況回補會補到錯的商品上。
        // 組合品項沒有 productId，直接照舊路徑走會送出 p_id: undefined
        if (isBundleOrderItem(item)) {
          return restoreBundleStock(item.bundleItems, item.quantity, adminSupabase);
        }
        return adminSupabase.rpc("increment_stock", {
          p_id: item.productId,
          qty:  item.quantity,
          spec: item.spec ?? "150g",
        });
      })
    );
  }

  // 還原折價券。
  //
  // orders.coupon_id 同時存兩種東西——批次券存 coupons.id、通用碼存
  // coupon_templates.id，訂單上沒有欄位記錄是哪一種。所以兩邊都要處理：
  // 批次券靠 id 更新（是通用碼時對不到列，自然無副作用），通用碼則靠
  // coupon_usages.order_id 刪除（不必先知道券的種類）。
  if (order.coupon_id) {
    await adminSupabase
      .from("coupons")
      .update({ used_at: null, order_id: null })
      .eq("id", order.coupon_id);
  }
  await adminSupabase.from("coupon_usages").delete().eq("order_id", id);

  // 還原已扣除的點數。退還量以 point_transactions 為準（見 refundOrderPoints），
  // 不看 orders 的 points_used / points_discount——那兩欄會隨制度變動漂移。
  await refundOrderPoints({
    userId: user.id,
    orderId: id,
    description: "訂單取消退還點數",
  });

  return NextResponse.json({ ok: true });
}
