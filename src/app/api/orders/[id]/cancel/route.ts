import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as adminSupabase } from "@/lib/supabase";

const CANCELLABLE_STATUSES = ["pending", "paid"];

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
    .select("id, user_id, payment_status")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
  }

  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "無權限操作此訂單" }, { status: 403 });
  }

  if (!CANCELLABLE_STATUSES.includes(order.payment_status)) {
    return NextResponse.json(
      { error: "此訂單狀態無法取消，若有需要請聯絡客服" },
      { status: 400 }
    );
  }

  const { error } = await adminSupabase
    .from("orders")
    .update({ payment_status: "cancelled" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "取消失敗，請稍後再試" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
