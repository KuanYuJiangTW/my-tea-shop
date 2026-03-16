import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// 綠界 server-side 付款通知（POST），必須回應 1|OK
export async function POST(req: NextRequest) {
  const formData     = await req.formData();
  const rtnCode      = formData.get("RtnCode");
  const tradeNo      = formData.get("MerchantTradeNo");

  if (rtnCode === "1" && tradeNo) {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("ecpay_trade_no", String(tradeNo));

    if (error) console.error("更新訂單付款狀態失敗:", error);
  }

  return new Response("1|OK", {
    headers: { "Content-Type": "text/plain" },
  });
}
