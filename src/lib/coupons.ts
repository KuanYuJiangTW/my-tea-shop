import { supabase } from "@/lib/supabase";

export type ResolvedCoupon = {
  type: "batch" | "universal";
  id: string;
  discount_amount: number;
  min_order_amount: number;
  // for universal: template_id
  template_id?: string;
};

/**
 * 驗證折價碼（支援批次券 + 通用碼）
 * 優先查詢批次券（coupons 表），查不到再查通用碼（coupon_templates 表）
 */
export async function resolveCouponCode(
  userId: string,
  code: string,
): Promise<{ valid: true; coupon: ResolvedCoupon } | { valid: false; error: string }> {
  const now = new Date().toISOString();

  // 1. 先查批次券（個人券）
  const { data: batchCoupon } = await supabase
    .from("coupons")
    .select("id, discount_amount, min_order_amount")
    .eq("user_id", userId)
    .eq("code", code)
    .is("used_at", null)
    .gt("expires_at", now)
    .single();

  if (batchCoupon) {
    return {
      valid: true,
      coupon: {
        type: "batch",
        id: batchCoupon.id,
        discount_amount: batchCoupon.discount_amount,
        min_order_amount: batchCoupon.min_order_amount,
      },
    };
  }

  // 2. 查通用碼模板
  const { data: template } = await supabase
    .from("coupon_templates")
    .select("id, discount_amount, min_order_amount, max_uses, max_uses_per_user, expires_at, is_active")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .gt("expires_at", now)
    .single();

  if (!template) {
    return { valid: false, error: "折價券無效或已過期" };
  }

  // 3. 檢查總使用次數
  if (template.max_uses) {
    const { count } = await supabase
      .from("coupon_usages")
      .select("id", { count: "exact", head: true })
      .eq("template_id", template.id);

    if ((count ?? 0) >= template.max_uses) {
      return { valid: false, error: "此折價碼已達使用上限" };
    }
  }

  // 4. 檢查每人使用次數
  if (template.max_uses_per_user) {
    const { count } = await supabase
      .from("coupon_usages")
      .select("id", { count: "exact", head: true })
      .eq("template_id", template.id)
      .eq("user_id", userId);

    if ((count ?? 0) >= template.max_uses_per_user) {
      return { valid: false, error: "您已使用過此折價碼" };
    }
  }

  return {
    valid: true,
    coupon: {
      type: "universal",
      id: template.id,
      template_id: template.id,
      discount_amount: template.discount_amount,
      min_order_amount: template.min_order_amount,
    },
  };
}

/**
 * 記錄通用碼使用
 */
export async function recordCouponUsage(params: {
  templateId: string;
  userId: string;
  orderId?: string;
  bookingId?: string;
}) {
  await supabase.from("coupon_usages").insert({
    template_id: params.templateId,
    user_id: params.userId,
    order_id: params.orderId ?? null,
    booking_id: params.bookingId ?? null,
  });
}
