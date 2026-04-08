import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function triggerRevalidate() {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  await fetch(`${base}/api/revalidate`, {
    method: "POST",
    headers: { "x-revalidate-secret": secret },
  }).catch(() => null); // 失敗不阻斷主流程
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = await req.json() as {
    name?: string;
    price?: number;
    stock_quantity?: number;
    price_75g?: number | null;
    stock_75g?: number | null;
    price_tea_bag?: number | null;
    stock_tea_bag?: number | null;
    is_active?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (body.name !== undefined)          update.name          = body.name;
  if (body.price !== undefined)         update.price         = body.price;
  if (body.stock_quantity !== undefined) update.stock_quantity = body.stock_quantity;
  if (body.price_75g !== undefined)     update.price_75g     = body.price_75g;
  if (body.stock_75g !== undefined)     update.stock_75g     = body.stock_75g;
  if (body.price_tea_bag !== undefined) update.price_tea_bag = body.price_tea_bag;
  if (body.stock_tea_bag !== undefined) update.stock_tea_bag = body.stock_tea_bag;
  if (body.is_active !== undefined)     update.is_active     = body.is_active;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("products")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 上下架變動時立即清除產品頁快取
  if (body.is_active !== undefined) {
    await triggerRevalidate();
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await triggerRevalidate();
  return NextResponse.json({ ok: true });
}
