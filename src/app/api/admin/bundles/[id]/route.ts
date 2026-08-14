import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

/**
 * 組合的上下架與定價。
 *
 * **為什麼一定要走 API**：`product_bundles` 開了 RLS 但只有 SELECT 政策，
 * 沒有 UPDATE 政策——刻意的，寫入只該由伺服器端的 service role 進行。
 * 所以在 Supabase 的 Table Editor 直接點 `is_active` 那個勾會被擋掉
 * （業主 2026-08-15 就是卡在這裡），只有這條路或 SQL Editor 有效。
 *
 * 成分不開放在這裡改：改成分會讓可售量與既有訂單的快照對不上，
 * 要動成分請走 SQL 並在 openspec 留紀錄。
 */
export const PATCH = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const body = (await req.json()) as { is_active?: boolean; price?: number };

  const update: Record<string, unknown> = {};
  if (body.is_active !== undefined) update.is_active = body.is_active;
  if (body.price !== undefined) {
    if (!Number.isInteger(body.price) || body.price <= 0) {
      return NextResponse.json({ error: "售價必須為正整數" }, { status: 400 });
    }
    update.price = body.price;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase.from("product_bundles").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 商品頁是動態渲染，但保險起見一併清快取
  revalidatePath("/products");
  revalidatePath("/en/products");

  return NextResponse.json({ ok: true });
}, "update_bundle");
