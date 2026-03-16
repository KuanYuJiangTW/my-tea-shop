import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = await req.json() as {
    name?: string;
    price?: number;
    stock_quantity?: number;
    is_active?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (body.name !== undefined)           update.name           = body.name;
  if (body.price !== undefined)          update.price          = body.price;
  if (body.stock_quantity !== undefined) update.stock_quantity = body.stock_quantity;
  if (body.is_active !== undefined)      update.is_active      = body.is_active;

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

  return NextResponse.json({ ok: true });
}
