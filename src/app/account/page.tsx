import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as adminSupabase } from "@/lib/supabase";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 確保 profile 存在
  await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, phone, city, address")
    .eq("id", user.id)
    .single();

  // 取得歷史訂單（service role key 繞過 RLS）
  const { data: orders } = await adminSupabase
    .from("orders")
    .select("id, created_at, total_amount, payment_status, payment_method, items, shipping_address")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <Suspense>
      <AccountClient
        user={{ id: user.id, email: user.email ?? "" }}
        profile={profile ?? null}
        orders={orders ?? []}
      />
    </Suspense>
  );
}
