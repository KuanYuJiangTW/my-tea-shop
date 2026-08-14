import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendOrderEmails, sendBookingEmails, type EmailOrderData, type BookingEmailData } from "@/lib/email";
import { decrementOrderItems } from "@/lib/order-bundles";

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

    // ── B 前綴：體驗預約付款 ─────────────────────────────────────────────────
    if (tradeNo.startsWith("B")) {
      // 計算 participants_due_at（session_date - 5 天）需先知道場次日期
      const { data: sessionInfo } = await supabase
        .from("experience_bookings")
        .select("session:experience_sessions(session_date)")
        .eq("ecpay_trade_no", tradeNo)
        .single();

      const rawDate = (sessionInfo?.session as { session_date?: string } | null)?.session_date;
      let participantsDueAt: string | null = null;
      if (rawDate) {
        const d = new Date(`${rawDate}T00:00:00`);
        d.setDate(d.getDate() - 5);
        participantsDueAt = d.toISOString();
      }

      // 冪等性：僅當預約仍為 pending_payment 時才確認，避免綠界重送通知導致重複寄信
      const { data: booking, error: bookingError } = await supabase
        .from("experience_bookings")
        .update({
          status:              "confirmed",
          paid_at:             new Date().toISOString(),
          ...(participantsDueAt ? { participants_due_at: participantsDueAt } : {}),
        })
        .eq("ecpay_trade_no", tradeNo)
        .eq("status", "pending_payment")
        .select("*, session:experience_sessions(session_date, start_time, experience_types(name))")
        .maybeSingle();

      if (bookingError) {
        console.error("更新體驗預約付款狀態失敗:", bookingError);
      } else if (booking) {
        // booking 非 null 代表本次確實由 pending_payment → confirmed，才寄信（重放時 booking 為 null，跳過）
        const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";
        const emailData: BookingEmailData = {
          bookingId:           booking.id,
          bookerName:          booking.booker_name,
          bookerEmail:         booking.booker_email,
          experienceName:      booking.session?.experience_types?.name ?? "茶藝體驗",
          sessionDate:         booking.session?.session_date,
          startTime:           booking.session?.start_time,
          participantCount:    booking.participant_count,
          totalPrice:          booking.total_price,
          participantsFillUrl: `${base}/account/bookings/${booking.id}/participants`,
        };
        await sendBookingEmails(emailData);
      }

      return new Response("1|OK", { headers: { "Content-Type": "text/plain" } });
    }

    // ── T 前綴：一般商品訂單付款 ─────────────────────────────────────────────
    // 冪等性：僅當訂單仍為 pending 時才標記 paid，避免綠界重送通知導致重複扣庫存/寄信
    const { data: order, error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("ecpay_trade_no", tradeNo)
      .eq("payment_status", "pending")
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("更新訂單付款狀態失敗:", error);
    } else if (order) {
      // order 非 null 代表本次確實由 pending → paid，才扣庫存與寄信（重放時 order 為 null，跳過）
      // 扣除庫存（線上付款，付款成功後才扣，原子性防超賣）
      const orderItems = order.items as { productId: number; quantity: number; spec: string }[];
      // 組合走 decrement_bundle_stock（單一交易），單品走 decrement_stock
      const stockFailed = !(await decrementOrderItems(orderItems));
      if (stockFailed) {
        // 付款已成功但庫存不足（極端競態），標記訂單需人工處理
        await supabase
          .from("orders")
          .update({ order_status: "stock_issue" })
          .eq("id", order.id);
        console.error("ECPay 付款成功但庫存扣減失敗，訂單需人工處理:", order.id);
      }

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
