import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("products")
    .select("id, stock_quantity, stock_75g, stock_tea_bag")
    .eq("is_active", true);

  if (error || !data) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(
    data.map(r => ({
      id:           r.id,
      stockQuantity: r.stock_quantity ?? undefined,
      stock75g:     r.stock_75g      != null ? r.stock_75g      : undefined,
      stockTeaBag:  r.stock_tea_bag  != null ? r.stock_tea_bag  : undefined,
    }))
  );
}
