import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendOrderEmails, type EmailOrderData } from "@/lib/email";

const HASH_KEY = process.env.ECPAY_HASH_KEY!;
const HASH_IV  = process.env.ECPAY_HASH_IV!;

function phpUrlencode(input: string): string {
  const SAFE = /^[A-Za-z0-9\-_.]$/;
  let out = "";
  for (const char of input) {
    if (char === " ")         out += "+";
    else if (SAFE.test(char)) out += char;
    else                      out += encodeURIComponent(char);
  }
  return out;
}

function verifyCheckMacValue(params: Record<string, string>): boolean {
  const { CheckMacValue, ...rest } = params;
  if (!CheckMacValue) return false;

  const chain = Object.keys(rest)
    .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
    .map(k => `${k}=${rest[k]}`)
    .join("&");
  const raw     = `HashKey=${HASH_KEY}&${chain}&HashIV=${HASH_IV}`;
  const encoded = phpUrlencode(raw).toLowerCase();
  const expected = createHash("sha256").update(encoded).digest("hex").toUpperCase();
  return expected === CheckMacValue;
}

// 綠界 server-side 付款通知（POST），必須回應 1|OK
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => { params[key] = String(value); });

  // 驗證綠界簽章，防止偽造付款通知
  if (!verifyCheckMacValue(params)) {
    console.error("ECPay CheckMacValue 驗證失敗");
    return new Response("0|CheckMacValue Error", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const rtnCode = params["RtnCode"];
  const tradeNo = params["MerchantTradeNo"];

  if (rtnCode === "1" && tradeNo) {
    // 更新付款狀態並取得訂單資料
    const { data: order, error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("ecpay_trade_no", tradeNo)
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
