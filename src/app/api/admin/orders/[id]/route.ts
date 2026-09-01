import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendShippingEmail } from "@/lib/email";
import { issuePoints, refundOrderPoints } from "@/lib/points";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { isBundleOrderItem, restoreBundleStock } from "@/lib/order-bundles";

type Params = { params: Promise<{ id: string }> };

export const GET = withAdminAuth(async (_req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
});

export const PATCH = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;

  const body = await req.json() as {
    orderStatus?: string;
    paymentStatus?: string;
    sendShippingEmail?: boolean;
    customerEmail?: string;
    customerName?: string;
    shippingAddress?: {
      type: "home" | "cvs";
      city?: string;
      address?: string;
      company?: string;
      storeName?: string;
    };
    items?: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
    totalAmount?: number;
    trackingNote?: string;
  };

  // 白名單驗證：防止插入任意字串到訂單狀態欄位
  const VALID_ORDER_STATUSES = ["new", "preparing", "shipped", "delivered", "completed", "cancelled"];
  const VALID_PAYMENT_STATUSES = ["pending", "paid", "failed"];

  if (body.orderStatus && !VALID_ORDER_STATUSES.includes(body.orderStatus)) {
    return NextResponse.json({ error: "無效的訂單狀態" }, { status: 400 });
  }
  if (body.paymentStatus && !VALID_PAYMENT_STATUSES.includes(body.paymentStatus)) {
    return NextResponse.json({ error: "無效的付款狀態" }, { status: 400 });
  }

  // Build update object from whichever fields were provided
  const updateData: Record<string, string> = {};
  if (body.orderStatus)   updateData.order_status   = body.orderStatus;
  if (body.paymentStatus) updateData.payment_status = body.paymentStatus;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "未提供更新欄位" }, { status: 400 });
  }

  // 更新前先取得訂單目前狀態（判斷是否剛變成 completed）
  const { data: prevOrder } = await supabase
    .from("orders")
    .select("order_status, user_id, items, subtotal, shipping_fee, discount_amount, coupon_discount, points_discount, coupon_id, points_used, payment_method, payment_status")
    .eq("id", id)
    .single();

  // 未付款不得推進狀態。
  //
  // 線上金流是「capture 成功才扣庫存」，所以未付款就出貨會讓帳面與實體同時錯：
  // 錢沒收到、庫存也從沒扣過，卻已經寄出貨通知信給客人。而 `preparing` 一樣要擋——
  // 它雖然不出貨，卻讓客人失去自助取消的能力（cancel 路由的 CANCELLABLE_STATUSES
  // 只含 `new`），等於把一個還沒付完款的人鎖在訂單裡。
  //
  // **COD 是唯一例外**：貨到付款本來就是先出貨後收款，擋了等於停掉整條業務。
  const ADVANCING_STATUSES = ["preparing", "shipped", "delivered", "completed"];
  if (body.orderStatus && ADVANCING_STATUSES.includes(body.orderStatus) && prevOrder) {
    // 以「這次請求寫入後的付款狀態」為準，而不是資料庫現值——否則同一請求
    // 既標記已付款又推進狀態（COD 的「確認收款」就是這樣）會被自己擋掉
    const effectivePaymentStatus = body.paymentStatus ?? prevOrder.payment_status;
    if (prevOrder.payment_method !== "cod" && effectivePaymentStatus !== "paid") {
      return NextResponse.json(
        { error: "此訂單尚未收到付款，無法推進狀態。請先確認金流入帳，或直接取消訂單。" },
        { status: 409 },
      );
    }
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 訂單狀態剛變成「已完成」→ 發放點數（新制：earnBase �� tier.points_rate × multiplier）
  if (
    body.orderStatus === "completed" &&
    prevOrder?.order_status !== "completed" &&
    prevOrder?.user_id
  ) {
    const { count } = await supabase
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("order_id", id)
      .eq("type", "earn");

    if ((count ?? 0) === 0) {
      const items = prevOrder.items as { subtotal: number }[] ?? [];
      const productSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
      // 新制：分開計算，避免雙重扣除
      const couponDisc = (prevOrder as Record<string, unknown>).coupon_discount as number ?? 0;
      const pointsDisc = (prevOrder as Record<string, unknown>).points_discount as number ?? 0;
      const earnBase = Math.max(productSubtotal - couponDisc - pointsDisc, 0);

      await issuePoints({
        userId: prevOrder.user_id as string,
        earnBase,
        orderId: id,
        description: "訂單完成回饋",
      });
    }
  }

  // 訂單狀態剛變成「已取消」→ 還原折價券與點數
  if (
    body.orderStatus === "cancelled" &&
    prevOrder?.order_status !== "cancelled" &&
    prevOrder?.user_id
  ) {
    // orders.coupon_id 批次券存 coupons.id、通用碼存 coupon_templates.id，
    // 訂單上沒有欄位分辨，故兩邊都處理：批次券靠 id 更新，通用碼靠 order_id 刪除
    if (prevOrder.coupon_id) {
      await supabase
        .from("coupons")
        .update({ used_at: null, order_id: null })
        .eq("id", prevOrder.coupon_id);
    }
    await supabase.from("coupon_usages").delete().eq("order_id", id);

    // 退還點數。退還量以 point_transactions 為準（見 refundOrderPoints），
    // 不看 orders 的 points_used / points_discount——那兩欄會隨制度變動漂移
    await refundOrderPoints({
      userId: prevOrder.user_id as string,
      orderId: id,
      description: "訂單取消退還點數",
    });

    // 還原庫存
    const shouldRestoreStock =
      prevOrder.payment_method !== "ecpay" || prevOrder.payment_status === "paid";

    if (shouldRestoreStock && Array.isArray(prevOrder.items)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderItems = prevOrder.items as any[];
      await Promise.all(
        orderItems.map((item) => {
          // 組合依下單當時的成分快照回補（成分被改過的話，照現況回補會補錯商品）
          if (isBundleOrderItem(item)) {
            return restoreBundleStock(item.bundleItems, item.quantity, supabase);
          }
          return supabase.rpc("increment_stock", {
            p_id: item.productId,
            qty:  item.quantity,
            spec: item.spec ?? "150g",
          });
        })
      );
    }
  }

  // Send shipping email if requested
  if (body.sendShippingEmail && body.customerEmail && body.customerName && body.shippingAddress && body.items) {
    try {
      await sendShippingEmail({
        orderId:        id,
        customerName:   body.customerName,
        customerEmail:  body.customerEmail,
        shippingAddress: body.shippingAddress,
        items:          body.items,
        totalAmount:    body.totalAmount ?? 0,
        trackingNote:   body.trackingNote,
      });
    } catch (emailErr) {
      console.error("出貨通知 Email 寄送失敗:", emailErr);
    }
  }

  return NextResponse.json({ ok: true });
}, "update_order");
