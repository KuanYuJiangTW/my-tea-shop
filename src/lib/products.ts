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

  return data.map((row) => ({
    id:            row.id,
    name:          row.name,
    nameEn:        row.name_en,
    category:      row.category,
    origin:        row.origin,
    altitude:      row.altitude,
    price:         row.price,
    weight:        row.weight,
    description:   row.description,
    color:         row.color,
    featured:      row.featured,
    image:         row.image_url   ?? undefined,
    image2:        row.image_url2  ?? undefined,
    stockQuantity: row.stock_quantity,
  }));
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

  return data.map((row) => ({
    id:            row.id,
    name:          row.name,
    nameEn:        row.name_en,
    category:      row.category,
    origin:        row.origin,
    altitude:      row.altitude,
    price:         row.price,
    weight:        row.weight,
    description:   row.description,
    color:         row.color,
    featured:      row.featured,
    image:         row.image_url   ?? undefined,
    image2:        row.image_url2  ?? undefined,
    stockQuantity: row.stock_quantity,
  }));
}
