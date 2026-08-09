import SessionsClient from "./SessionsClient";
import { supabase } from "@/lib/supabase";

export default async function AdminSessionsPage() {
  const { data: expTypes } = await supabase
    .from("experience_types")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("id");

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9F6F1]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-tea-text font-serif">場次管理</h1>
        <p className="text-sm text-tea-text-light mt-0.5">新增、查看或取消體驗場次</p>
      </div>
      <SessionsClient expTypes={expTypes ?? []} />
    </div>
  );
}
