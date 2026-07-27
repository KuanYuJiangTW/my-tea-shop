import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

// GET /api/admin/campaigns — 列表（支援 status 篩選）
export const GET = withAdminAuth(async (req: NextRequest) => {
  const status = req.nextUrl.searchParams.get("status"); // active | ended | all

  let query = supabase
    .from("points_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  const now = new Date().toISOString();
  if (status === "active") {
    query = query.eq("is_active", true).gte("ends_at", now);
  } else if (status === "ended") {
    query = query.lt("ends_at", now);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

// POST /api/admin/campaigns — 新增活動
export const POST = withAdminAuth(async (req: NextRequest) => {
  const body = await req.json();

  const { name, description, multiplier, campaign_type, starts_at, ends_at, target_product_ids, target_tier_ids, min_order_amount } = body;

  if (!name?.trim()) return NextResponse.json({ error: "活動名稱為必填" }, { status: 400 });
  if (!multiplier || multiplier < 1 || multiplier > 10) return NextResponse.json({ error: "倍率須在 1~10 之間" }, { status: 400 });
  if (!starts_at || !ends_at) return NextResponse.json({ error: "起訖時間為必填" }, { status: 400 });
  if (new Date(ends_at) <= new Date(starts_at)) return NextResponse.json({ error: "結束時間須在開始時間之後" }, { status: 400 });

  const validTypes = ["global", "product", "first_purchase", "tier_specific"];
  if (campaign_type && !validTypes.includes(campaign_type)) {
    return NextResponse.json({ error: "無效的活動類型" }, { status: 400 });
  }

  const { data, error } = await supabase.from("points_campaigns").insert({
    name: name.trim(),
    description: description?.trim() || null,
    multiplier,
    campaign_type: campaign_type || "global",
    starts_at,
    ends_at,
    target_product_ids: target_product_ids || null,
    target_tier_ids: target_tier_ids || null,
    min_order_amount: min_order_amount || 0,
    is_active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}, "create_campaign");
