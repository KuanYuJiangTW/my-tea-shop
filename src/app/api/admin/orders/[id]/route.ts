import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendShippingEmail } from "@/lib/email";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
    .select("order_status, user_id, items, shipping_fee, discount_amount, coupon_id, points_used, payment_method, payment_status")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 訂單狀態剛變成「已完成」→ 發放點數（防止重複：確認該訂單尚無 earn 記錄）
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
      const couponDiscount = (prevOrder.discount_amount as number) ?? 0;
      const pointsDiscount = ((prevOrder.points_used as number) ?? 0) / 100;
      const earnBase = Math.max(Math.floor(productSubtotal - couponDiscount - pointsDiscount), 0);
      await supabase.from("point_transactions").insert({
        user_id:     prevOrder.user_id,
        points:      earnBase,
        type:        "earn",
        order_id:    id,
        description: "訂單完成回饋",
        expires_at:  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  // 訂單狀態剛變成「已取消」→ 還原折價券與點數
  if (
    body.orderStatus === "cancelled" &&
    prevOrder?.order_status !== "cancelled" &&
    prevOrder?.user_id
  ) {
    if (prevOrder.coupon_id) {
      await supabase
        .from("coupons")
        .update({ used_at: null, order_id: null })
        .eq("id", prevOrder.coupon_id);
    }

    if (prevOrder.points_used > 0) {
      await supabase.from("point_transactions").insert({
        user_id:     prevOrder.user_id,
        points:      prevOrder.points_used,
        type:        "earn",
        order_id:    id,
        description: "訂單取消退還點數",
      });
    }

    // 還原庫存
    const shouldRestoreStock =
      prevOrder.payment_method !== "ecpay" || prevOrder.payment_status === "paid";

    if (shouldRestoreStock && Array.isArray(prevOrder.items)) {
      const orderItems = prevOrder.items as { productId: number; quantity: number; spec: string }[];
      await Promise.all(
        orderItems.map((item) =>
          supabase.rpc("increment_stock", {
            p_id: item.productId,
            qty:  item.quantity,
            spec: item.spec ?? "150g",
          })
        )
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
}
