import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

/**
 * 體驗的上架／下架（openspec experience-visibility-toggle）。
 *
 * **只接受 `{ is_active: boolean }`**：多帶任何欄位（例如 price）一律 400。
 * 這支不是通用的「改體驗」API——價格、人數上限牽動已成立預約的金額與名額，
 * 不該從一個開關的後門被改掉。
 *
 * 獨立成 `/experience-types/[id]` 而不是塞進 experience-ordering 的 PATCH，
 * 是為了讓 withAdminAuth 從網址最後一段取到 resource_id，稽核紀錄才知道是哪一款
 * （design D2）。
 *
 * 下架只擋**新的**入口（預約、加入候補、想來登記），已成立的預約照舊（D4／D5）。
 */
export const PATCH = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "體驗編號不正確" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body || typeof body !== "object" || Array.isArray(body) ||
    typeof body.is_active !== "boolean" ||
    Object.keys(body).some((k) => k !== "is_active")
  ) {
    return NextResponse.json({ error: "只接受 { is_active: true | false }" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("experience_types")
    .update({ is_active: body.is_active })
    .eq("id", Number(id))
    .select("id, slug, is_active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "找不到這個體驗" }, { status: 404 });
  }

  // 清全站快取（design D3）：首頁、列表、詳細頁、每一篇茶知識文章的體驗卡、
  // sitemap 都會顯示體驗，中英文都有（/en 是 proxy rewrite）。逐一列路徑很容易漏，
  // 漏掉的那頁會繼續顯示已下架的體驗一小時；上下架一年才幾次，清全站換「保證不漏」
  revalidatePath("/", "layout");
  // sitemap.xml 是 metadata route，不在 layout 樹裡，上面那行清不到它。
  // 2026-11-07 正式站實測：下架後頁面 1 分鐘內就更新了，sitemap 卻還是部署當下的版本
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ ok: true, type: data[0] });
}, "update_experience_active");
