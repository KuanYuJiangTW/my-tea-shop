import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as adminSupabase } from "@/lib/supabase";

const EDITABLE_STATUSES = ["pending", "paid", "preparing"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 驗證登入狀態
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await req.json() as {
    city: string;
    address: string;
  };

  if (!body.city?.trim() || !body.address?.trim()) {
    return NextResponse.json({ error: "請填寫完整的縣市與地址" }, { status: 400 });
  }

  // 確認訂單屬於此會員
  const { data: order, error: fetchError } = await adminSupabase
    .from("orders")
    .select("id, user_id, payment_status, shipping_address")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
  }

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "無權限操作此訂單" }, { status: 403 });
  }

  if (!EDITABLE_STATUSES.includes(order.payment_status)) {
    return NextResponse.json(
      { error: "訂單已出貨，無法修改地址" },
      { status: 400 }
    );
  }

  if (order.shipping_address?.type !== "home") {
    return NextResponse.json(
      { error: "超商取貨地址無法線上修改，請聯絡客服" },
      { status: 400 }
    );
  }

  const newAddress = {
    ...order.shipping_address,
    city: body.city.trim(),
    address: body.address.trim(),
  };

  const { error } = await adminSupabase
    .from("orders")
    .update({ shipping_address: newAddress })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "更新失敗，請稍後再試" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
