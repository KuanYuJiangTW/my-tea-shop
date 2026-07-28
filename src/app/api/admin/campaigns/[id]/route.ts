import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { getAdminActor } from "@/lib/admin-token";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/campaigns/[id]
export const GET = withAdminAuth(async (_req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;
  const { data, error } = await supabase
    .from("points_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: "找不到此活動" }, { status: 404 });
  return NextResponse.json(data);
});

// PATCH /api/admin/campaigns/[id] — 編輯活動
export const PATCH = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;
  const body = await req.json();

  // 不允許編輯已結束的活動
  const { data: existing } = await supabase
    .from("points_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "找不到此活動" }, { status: 404 });
  if (new Date(existing.ends_at) < new Date()) {
    return NextResponse.json({ error: "已結束的活動不可編輯" }, { status: 409 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.multiplier !== undefined) {
    if (body.multiplier < 1 || body.multiplier > 10) return NextResponse.json({ error: "倍率須在 1~10 之間" }, { status: 400 });
    update.multiplier = body.multiplier;
  }
  if (body.starts_at !== undefined) update.starts_at = body.starts_at;
  if (body.ends_at !== undefined) update.ends_at = body.ends_at;
  if (body.is_active !== undefined) update.is_active = body.is_active;
  if (body.target_product_ids !== undefined) update.target_product_ids = body.target_product_ids;
  if (body.target_tier_ids !== undefined) update.target_tier_ids = body.target_tier_ids;
  if (body.min_order_amount !== undefined) update.min_order_amount = body.min_order_amount;

  // 記錄變更前的值
  const changedFields = Object.keys(update).filter(k => k !== "updated_at");
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  for (const field of changedFields) {
    oldValues[field] = existing[field];
    newValues[field] = update[field];
  }

  const { data, error } = await supabase
    .from("points_campaigns")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 寫入 audit log
  if (changedFields.length > 0) {
    await supabase.from("campaign_audit_log").insert({
      campaign_id: id,
      action: "update",
      changed_fields: changedFields,
      old_values: oldValues,
      new_values: newValues,
      admin_id: await getAdminActor(), // 不用 body.adminId：客端可偽造
    });
  }

  return NextResponse.json(data);
}, "update_campaign");

// DELETE /api/admin/campaigns/[id] — 停用（soft delete）
export const DELETE = withAdminAuth(async (_req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;

  const { error } = await supabase
    .from("points_campaigns")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 寫入 audit log
  await supabase.from("campaign_audit_log").insert({
    campaign_id: id,
    action: "deactivate",
    changed_fields: ["is_active"],
    old_values: { is_active: true },
    new_values: { is_active: false },
    admin_id: await getAdminActor(), // 不用 body.adminId：客端可偽造
  });

  return NextResponse.json({ ok: true });
}, "delete_campaign");
