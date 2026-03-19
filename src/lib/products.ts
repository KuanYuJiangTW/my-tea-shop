import { supabase } from "./supabase";
import type { Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (error || !data) {
    console.error("讀取產品失敗:", error);
    return [];
  }

  return data.map(mapRow);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("featured", true)
    .order("id");

  if (error || !data) {
    console.error("讀取精選產品失敗:", error);
    return [];
  }

  return data.map(mapRow);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Product {
  const price = row.price as number;
  return {
    id:            row.id,
    name:          row.name,
    nameEn:        row.name_en,
    category:      row.category,
    origin:        row.origin,
    altitude:      row.altitude,
    price,
    weight:        row.weight,
    description:   row.description,
    color:         row.color,
    featured:      row.featured,
    image:         row.image_url   ?? undefined,
    image2:        row.image_url2  ?? undefined,
    stockQuantity: row.stock_quantity,
    // 若 DB 日後新增欄位可直接使用；否則以公式計算
    price75g:    row.price_75g    ?? Math.round(price * 0.6 / 10) * 10,
    priceTeaBag: row.price_tea_bag ?? Math.round(price * 0.7 / 10) * 10,
  };
}
