import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

export const PATCH = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body = await req.json() as {
    name?: string;
    name_en?: string;
    category?: string;
    origin?: string;
    origin_en?: string;
    altitude?: string;
    weight?: string;
    description?: string;
    description_en?: string;
    color?: string;
    image_url?: string;
    image_url2?: string;
    gallery?: string[];
    price?: number;
    stock_quantity?: number;
    price_75g?: number | null;
    stock_75g?: number | null;
    price_tea_bag?: number | null;
    stock_tea_bag?: number | null;
    is_active?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (body.name !== undefined)            update.name            = body.name;
  if (body.name_en !== undefined)         update.name_en         = body.name_en;
  if (body.category !== undefined)        update.category        = body.category;
  if (body.origin !== undefined)          update.origin          = body.origin;
  if (body.origin_en !== undefined)       update.origin_en       = body.origin_en;
  if (body.altitude !== undefined)        update.altitude        = body.altitude;
  if (body.weight !== undefined)          update.weight          = body.weight;
  if (body.description !== undefined)     update.description     = body.description;
  if (body.description_en !== undefined)  update.description_en  = body.description_en;
  if (body.color !== undefined)           update.color           = body.color;
  if (body.image_url !== undefined)       update.image_url       = body.image_url;
  if (body.image_url2 !== undefined)      update.image_url2      = body.image_url2;
  if (body.gallery !== undefined)         update.gallery         = body.gallery;
  if (body.price !== undefined)           update.price           = body.price;
  if (body.stock_quantity !== undefined)   update.stock_quantity  = body.stock_quantity;
  if (body.price_75g !== undefined)       update.price_75g       = body.price_75g;
  if (body.stock_75g !== undefined)       update.stock_75g       = body.stock_75g;
  if (body.price_tea_bag !== undefined)   update.price_tea_bag   = body.price_tea_bag;
  if (body.stock_tea_bag !== undefined)   update.stock_tea_bag   = body.stock_tea_bag;
  if (body.is_active !== undefined)       update.is_active       = body.is_active;

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

  // 任何儲存都立即清除產品頁快取
  revalidatePath("/products");

  return NextResponse.json({ ok: true });
}, "update_product");

export const DELETE = withAdminAuth(async (_req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/products");
  return NextResponse.json({ ok: true });
}, "delete_product");
