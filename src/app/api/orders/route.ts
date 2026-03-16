import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { CreateOrderRequest } from "@/types";

export async function POST(req: NextRequest) {
  const body = await req.json() as CreateOrderRequest;

  const shippingAddress =
    body.deliveryType === "home"
      ? { type: "home", city: body.shippingAddress?.city, address: body.shippingAddress?.address }
      : { type: "cvs",  company: body.cvsInfo?.company,   storeName: body.cvsInfo?.storeName };

  const items = body.items.map((i) => ({
    productId: i.productId,
    name:      i.name,
    quantity:  i.quantity,
    unitPrice: i.unitPrice,
    subtotal:  i.unitPrice * i.quantity,
  }));

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name:    body.customer.name,
      customer_email:   body.customer.email,
      customer_phone:   body.customer.phone,
      payment_method:   body.paymentMethod,
      shipping_address: shippingAddress,
      items,
      shipping_fee:     body.shippingFee,
      total_amount:     body.totalAmount,
      payment_status:   "pending",
      note:             body.note ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("建立訂單失敗:", error);
    return NextResponse.json({ error: "建立訂單失敗" }, { status: 500 });
  }

  return NextResponse.json({ orderId: data.id });
}
