import SessionsClient from "./SessionsClient";
import { supabase } from "@/lib/supabase";

export default async function AdminSessionsPage() {
  // 列出全部體驗，讓業主可以「先排場次、再上架」（openspec experience-visibility-toggle D6）。
  // 上架中的排前面，預設選到的才會是能賣的那款
  const { data: rows } = await supabase
    .from("experience_types")
    .select("id, name, slug, is_active")
    .order("is_active", { ascending: false })
    .order("id");

  const expTypes = (rows ?? []).map(t => ({
    id:   t.id,
    slug: t.slug,
    name: t.is_active ? t.name : `${t.name}（未上架）`,
  }));

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9F6F1]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-tea-text font-serif">場次管理</h1>
        <p className="text-sm text-tea-text-light mt-0.5">新增、查看或取消體驗場次</p>
      </div>
      <SessionsClient expTypes={expTypes} />
    </div>
  );
}
