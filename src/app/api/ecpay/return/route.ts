import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendOrderEmails, type EmailOrderData } from "@/lib/email";

// 綠界 server-side 付款通知（POST），必須回應 1|OK
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const rtnCode  = formData.get("RtnCode");
  const tradeNo  = formData.get("MerchantTradeNo");

  if (rtnCode === "1" && tradeNo) {
    // 更新付款狀態並取得訂單資料
    const { data: order, error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("ecpay_trade_no", String(tradeNo))
      .select("*")
      .single();

    if (error) {
      console.error("更新訂單付款狀態失敗:", error);
    } else if (order) {
      // 扣除庫存（線上付款，付款成功後才扣）
      const orderItems = order.items as { productId: number; quantity: number }[];
      await Promise.all(
        orderItems.map((item) =>
          supabase.rpc("decrement_stock", { p_id: item.productId, qty: item.quantity })
        )
      );

      // 寄送訂單確認信
      const emailData: EmailOrderData = {
        orderId:         order.id,
        customerName:    order.customer_name,
        customerEmail:   order.customer_email,
        paymentMethod:   order.payment_method,
        shippingAddress: order.shipping_address,
        items:           order.items,
        shippingFee:     order.shipping_fee,
        totalAmount:     order.total_amount,
        note:            order.note ?? undefined,
      };
      await sendOrderEmails(emailData);
    }
  }

  return new Response("1|OK", {
    headers: { "Content-Type": "text/plain" },
  });
}
