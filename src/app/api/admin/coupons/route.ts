import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { checkAmount, checkArray, checkDate, checkIntRange, checkText, firstError, MAX_NAME_LEN } from "@/lib/validate";

// GET /api/admin/coupons — 列表（含使用率統計）
export const GET = withAdminAuth(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get("type"); // batch | universal | all

  if (type === "universal") {
    // 通用碼模板列表
    const { data: templates, error } = await supabase
      .from("coupon_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 附上使用率
    const templateIds = (templates ?? []).map(t => t.id);
    const { data: usages } = await supabase
      .from("coupon_usages")
      .select("template_id")
      .in("template_id", templateIds.length > 0 ? templateIds : ["none"]);

    const usageCount: Record<string, number> = {};
    (usages ?? []).forEach(u => {
      usageCount[u.template_id] = (usageCount[u.template_id] ?? 0) + 1;
    });

    const result = (templates ?? []).map(t => ({
      ...t,
      used_count: usageCount[t.id] ?? 0,
      usage_rate: t.max_uses ? Math.round((usageCount[t.id] ?? 0) / t.max_uses * 100) : null,
    }));

    return NextResponse.json(result);
  }

  // 批次券（個人折價券）列表
  const { data, error } = await supabase
    .from("coupons")
    .select("id, code, source, discount_amount, min_order_amount, expires_at, used_at, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});

// POST /api/admin/coupons — 新增（批次券 or 通用碼）
export const POST = withAdminAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { type } = body; // "batch" | "universal"

  if (type === "universal") {
    // 建立通用碼模板
    const { code, name, discount_amount, min_order_amount, max_uses, max_uses_per_user, expires_at } = body;

    const err = firstError(
      checkText(code, "折價碼", { max: 50, required: true }),
      checkText(name, "名稱", { max: MAX_NAME_LEN }),
      checkAmount(discount_amount, "折扣金額", { required: true, min: 1 }),
      checkAmount(min_order_amount, "最低消費金額"),
      checkIntRange(max_uses, "使用次數上限", 1, 1_000_000),
      checkIntRange(max_uses_per_user, "每人使用次數上限", 1, 1_000),
      checkDate(expires_at, "到期日", true),
    );
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const { data, error } = await supabase.from("coupon_templates").insert({
      code: code.trim().toUpperCase(),
      name: name?.trim() || code.trim().toUpperCase(),
      discount_amount,
      min_order_amount: min_order_amount || 0,
      max_uses: max_uses || null,
      max_uses_per_user: max_uses_per_user ?? 1,
      expires_at,
      is_active: true,
    }).select().single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "此折價碼已存在" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  }

  // 批次發放個人折價券
  const { user_ids, discount_amount, min_order_amount, expires_days, source } = body;

  const batchErr = firstError(
    // 上限 5000：一次發放過多會拖垮單一請求，也常是誤操作
    checkArray(user_ids, "發放對象", 5_000, true),
    checkAmount(discount_amount, "折扣金額", { required: true, min: 1 }),
    checkAmount(min_order_amount, "最低消費金額"),
    checkIntRange(expires_days, "有效天數", 1, 3_650),
    checkText(source, "來源", { max: 50 }),
  );
  if (batchErr) return NextResponse.json({ error: batchErr }, { status: 400 });

  const expiresAt = new Date(Date.now() + (expires_days ?? 30) * 24 * 60 * 60 * 1000).toISOString();

  const coupons = user_ids.map((uid: string) => ({
    user_id: uid,
    code: `BATCH${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    source: source || "admin_batch",
    discount_amount,
    min_order_amount: min_order_amount || 0,
    expires_at: expiresAt,
  }));

  const { data, error } = await supabase.from("coupons").insert(coupons).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: data?.length ?? 0 }, { status: 201 });
}, "create_coupon");
