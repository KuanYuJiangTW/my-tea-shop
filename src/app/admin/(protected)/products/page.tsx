import { supabase } from "@/lib/supabase";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, name_en, category, price, stock_quantity, is_active, weight")
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
