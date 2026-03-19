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

  // Build update object from whichever fields were provided
  const updateData: Record<string, string> = {};
  if (body.orderStatus)   updateData.order_status   = body.orderStatus;
  if (body.paymentStatus) updateData.payment_status = body.paymentStatus;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "未提供更新欄位" }, { status: 400 });
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
