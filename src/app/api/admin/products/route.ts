import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

export const GET = withAdminAuth(async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toStrOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "無效的請求格式" }, { status: 400 });
  }

  const { slug, price, ...rest } = body;

  if (!slug || String(slug).trim() === "") {
    return NextResponse.json({ error: "Slug 為必填" }, { status: 400 });
  }
  const slugVal = String(slug).trim();

  const priceNum = toNumOrNull(price);
  if (priceNum === null || priceNum < 0) {
    return NextResponse.json({ error: "150g 售價為必填，且須為 0 或正整數" }, { status: 400 });
  }

  // 確認 slug 唯一
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slugVal)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Slug 已存在，請使用其他 slug" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      slug:           slugVal,
      price:          priceNum,
      name:           toStr(rest.name) || slugVal,
      name_en:        toStr(rest.name_en),
      category:       toStr(rest.category),
      origin:         toStr(rest.origin),
      altitude:       toStr(rest.altitude),
      weight:         toStr(rest.weight),
      description:    toStr(rest.description),
      color:          toStr(rest.color),
      image_url:      toStr(rest.image_url),
      image_url2:     toStr(rest.image_url2),
      gallery:        Array.isArray(rest.gallery) ? rest.gallery : [],
      stock_quantity: toNumOrNull(rest.stock_quantity),
      price_75g:      toNumOrNull(rest.price_75g),
      stock_75g:      toNumOrNull(rest.stock_75g),
      price_tea_bag:  toNumOrNull(rest.price_tea_bag),
      stock_tea_bag:  toNumOrNull(rest.stock_tea_bag),
      featured:       false,
      is_active:      false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
});
