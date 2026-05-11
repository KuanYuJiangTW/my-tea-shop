import { supabase } from "@/lib/supabase";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, name, name_en, category, origin, origin_en, altitude, weight, description, description_en, color, image_url, image_url2, gallery, price, stock_quantity, price_75g, stock_75g, price_tea_bag, stock_tea_bag, shipping_weight_150g, shipping_weight_75g, shipping_weight_teabag, is_active")
    .order("id", { ascending: true });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500 text-sm">載入產品失敗：{error.message}</p>
      </div>
    );
  }

  return <ProductsClient initialProducts={products ?? []} />;
}
