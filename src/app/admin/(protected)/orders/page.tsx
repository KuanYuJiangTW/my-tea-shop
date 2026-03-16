import { supabase } from "@/lib/supabase";
import OrdersClient from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, created_at, customer_name, customer_email, customer_phone, total_amount, payment_status, payment_method, items, shipping_address, note")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500 text-sm">載入訂單失敗：{error.message}</p>
      </div>
    );
  }

  return <OrdersClient initialOrders={orders ?? []} />;
}
