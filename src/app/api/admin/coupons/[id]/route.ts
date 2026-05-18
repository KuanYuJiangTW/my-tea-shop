import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/coupons/[id] — 編輯通用碼模板
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const { data: existing } = await supabase
    .from("coupon_templates")
    .select("expires_at")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "找不到此折價券" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.discount_amount !== undefined) update.discount_amount = body.discount_amount;
  if (body.min_order_amount !== undefined) update.min_order_amount = body.min_order_amount;
  if (body.max_uses !== undefined) update.max_uses = body.max_uses;
  if (body.max_uses_per_user !== undefined) update.max_uses_per_user = body.max_uses_per_user;
  if (body.expires_at !== undefined) update.expires_at = body.expires_at;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const { data, error } = await supabase
    .from("coupon_templates")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/coupons/[id] — 停用
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { error } = await supabase
    .from("coupon_templates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
