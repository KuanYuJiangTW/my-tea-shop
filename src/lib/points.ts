import { supabase } from "@/lib/supabase";
import { sendTierUpgradeEmail } from "@/lib/email";

// ─── 會員等級設定 ─────────────────────────────────────────────────────────────

export type MemberTier = {
  id: string;
  name: string;
  min_annual_spend: number;
  points_rate: number;       // 0.02, 0.03, 0.04
  max_discount_rate: number; // 0.10, 0.15, 0.20
};

// Fallback: 若 DB 查不到 tier，使用 standard 預設值
const DEFAULT_TIER: MemberTier = {
  id: "standard",
  name: "一般會員",
  min_annual_spend: 0,
  points_rate: 0.02,
  max_discount_rate: 0.10,
};

// ─── 查詢用戶等級 ─────────────────────────────────────────────────────────────

export async function getUserTier(userId: string): Promise<MemberTier> {
  const { data } = await supabase
    .from("user_membership")
    .select("tier_id, member_tiers(*)")
    .eq("user_id", userId)
    .single();

  if (data?.member_tiers) {
    const t = data.member_tiers as unknown as MemberTier;
    return t;
  }
  return DEFAULT_TIER;
}

// ─── 查詢有效餘額（排除過期點數）─────────────────────────────────────────────

export async function getValidBalance(userId: string): Promise<number> {
  const now = new Date().toISOString();

  // 分兩次查詢，在 DB 層過濾，避免拉全部交易到 application 層
  // 1. 未過期的正向點數（earn + refund 中有 expires_at 且未過期的，或無 expires_at 的正值）
  // 2. 所有負向點數（redeem，永遠計入）

  const [positiveRes, negativeRes] = await Promise.all([
    // 正向點數：未過期（expires_at > now 或 expires_at 為 null）
    supabase
      .from("point_transactions")
      .select("points")
      .eq("user_id", userId)
      .gt("points", 0)
      .or(`expires_at.gt.${now},expires_at.is.null`),
    // 負向點數（redeem）：全部計入
    supabase
      .from("point_transactions")
      .select("points")
      .eq("user_id", userId)
      .lt("points", 0),
  ]);

  const positiveSum = (positiveRes.data ?? []).reduce((s, t) => s + t.points, 0);
  const negativeSum = (negativeRes.data ?? []).reduce((s, t) => s + t.points, 0);

  return Math.max(positiveSum + negativeSum, 0);
}

// ─── 點數折抵驗證 ─────────────────────────────────────────────────────────────

export const MIN_POINTS_USE = 10;

export type RedemptionResult = {
  valid: boolean;
  error?: string;
  pointsUsed: number;
  pointsDiscount: number; // 1:1，等於 pointsUsed
};

export async function validateRedemption(
  userId: string,
  pointsToUse: number,
  afterCouponAmount: number,
): Promise<RedemptionResult> {
  if (pointsToUse <= 0) {
    return { valid: true, pointsUsed: 0, pointsDiscount: 0 };
  }

  if (pointsToUse < MIN_POINTS_USE) {
    return { valid: false, error: `最低使用 ${MIN_POINTS_USE} 點`, pointsUsed: 0, pointsDiscount: 0 };
  }

  // 查詢用戶等級取得折抵上限比率
  const tier = await getUserTier(userId);
  const maxDiscount = Math.floor(afterCouponAmount * tier.max_discount_rate);

  if (pointsToUse > maxDiscount) {
    return { valid: false, error: `點數折抵上限為 NT$${maxDiscount}`, pointsUsed: 0, pointsDiscount: 0 };
  }

  // 查詢有效餘額
  const balance = await getValidBalance(userId);
  if (balance < pointsToUse) {
    return { valid: false, error: "點數不足", pointsUsed: 0, pointsDiscount: 0 };
  }

  return {
    valid: true,
    pointsUsed: pointsToUse,
    pointsDiscount: pointsToUse, // 1:1
  };
}

// ─── 點數發放計算 ─────────────────────────────────────────────────────────────

export async function calculateEarning(
  userId: string,
  earnBase: number,
  orderId?: string,
  bookingId?: string,
): Promise<number> {
  const tier = await getUserTier(userId);

  // 查詢當前適���的活動倍率
  const multiplier = await getActiveMultiplier(userId, orderId, bookingId);

  const points = Math.floor(earnBase * tier.points_rate * multiplier);
  return Math.max(points, 0);
}

// ─── 查詢當前最高活動倍率 ─────────────────────────────────────────────────────

async function getActiveMultiplier(
  userId: string,
  orderId?: string,
  bookingId?: string,
): Promise<number> {
  const now = new Date().toISOString();

  const { data: campaigns } = await supabase
    .from("points_campaigns")
    .select("*")
    .eq("is_active", true)
    .lte("starts_at", now)
    .gte("ends_at", now);

  if (!campaigns || campaigns.length === 0) return 1.0;

  let maxMultiplier = 1.0;

  // 預先判斷是否首購（迴圈外只查一次，避免 N+1）
  const hasFirstPurchaseCampaign = campaigns.some(c => c.campaign_type === "first_purchase");
  let isFirstPurchase = false;
  if (hasFirstPurchaseCampaign) {
    const { count } = await supabase
      .from("point_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "earn");
    isFirstPurchase = (count ?? 0) === 0;
  }

  for (const camp of campaigns) {
    if (camp.campaign_type === "global") {
      maxMultiplier = Math.max(maxMultiplier, camp.multiplier);
    }

    if (camp.campaign_type === "first_purchase" && isFirstPurchase) {
      maxMultiplier = Math.max(maxMultiplier, camp.multiplier);
    }

    // product / tier_specific 等類型可日後擴充
  }

  return maxMultiplier;
}

// ─── 發放點數（寫入 DB）─────────────────────────────────────────────────────

export async function issuePoints(params: {
  userId: string;
  earnBase: number;
  orderId?: string;
  bookingId?: string;
  description?: string;
}): Promise<{ points: number; multiplier: number }> {
  const { userId, earnBase, orderId, bookingId, description } = params;

  const tier = await getUserTier(userId);
  const multiplier = await getActiveMultiplier(userId, orderId, bookingId);
  const points = Math.floor(earnBase * tier.points_rate * multiplier);

  if (points <= 0) return { points: 0, multiplier };

  await supabase.from("point_transactions").insert({
    user_id: userId,
    points,
    type: "earn",
    order_id: orderId ?? null,
    booking_id: bookingId ?? null,
    description: description ?? "消費回饋",
    multiplier,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    is_flagged: multiplier > 5,
  });

  // 更新年消費 + 升等
  await updateMembershipSpend(userId, earnBase);

  return { points, multiplier };
}

// ─── 扣除點數（結帳時）─────────────────────────────────────────────────────

export async function deductPoints(params: {
  userId: string;
  points: number;
  orderId?: string;
  bookingId?: string;
  description?: string;
}) {
  const { userId, points, orderId, bookingId, description } = params;
  if (points <= 0) return;

  await supabase.from("point_transactions").insert({
    user_id: userId,
    points: -points,
    type: "redeem",
    order_id: orderId ?? null,
    booking_id: bookingId ?? null,
    description: description ?? `折抵 NT$${points}`,
  });
}

// ─── 退還點數���取消時）─────────────────────────────────────────────────────

export async function refundPoints(params: {
  userId: string;
  points: number;
  orderId?: string;
  bookingId?: string;
  description?: string;
}) {
  const { userId, points, orderId, bookingId, description } = params;
  if (points <= 0) return;

  await supabase.from("point_transactions").insert({
    user_id: userId,
    points,
    type: "refund",
    order_id: orderId ?? null,
    booking_id: bookingId ?? null,
    description: description ?? "取消退還點數",
  });
}

// ─── 取消訂單時退還點數（以帳本為準）──────────────────────────────────────────

/**
 * 退還某筆訂單尚未退還的點數。
 *
 * 退還量以 `point_transactions` 為準，不看 `orders.points_used` 或
 * `orders.points_discount`——那兩欄會隨制度變動漂移。2026-08-01 的線上資料裡，
 * 舊制訂單的 `points_used = 3300`、`points_discount = 33`，而帳本實際只扣了
 * 33 點；照 `points_used` 退就會憑空送出 3267 點。新制 1:1 之後三者才一致。
 *
 * 「已扣 − 已退」的算法同時帶來冪等性：重複呼叫時差額為 0，不會重複退點。
 *
 * @returns 實際退還的點數（0 代表無需退還）
 */
export async function refundOrderPoints(params: {
  userId: string;
  orderId: string;
  description?: string;
}): Promise<number> {
  const { userId, orderId, description } = params;

  const { data: rows } = await supabase
    .from("point_transactions")
    .select("points, type")
    .eq("order_id", orderId);

  if (!rows || rows.length === 0) return 0;

  let deducted = 0;
  let alreadyRefunded = 0;
  for (const r of rows as { points: number; type: string }[]) {
    if (r.type === "redeem") deducted += -r.points;
    else if (r.type === "refund") alreadyRefunded += r.points;
  }

  const outstanding = deducted - alreadyRefunded;
  if (outstanding <= 0) return 0;

  await refundPoints({
    userId,
    points: outstanding,
    orderId,
    description: description ?? "訂單取消退還點數",
  });

  return outstanding;
}

// ─── 取消體驗預約時退還點數（以帳本為準，支援部分比例）──────────────────────

/**
 * 退還某筆體驗預約尚未退還的點數，可指定退款比例。
 *
 * 與 `refundOrderPoints` 同樣以 `point_transactions` 為準，不看
 * `experience_bookings.points_used` / `points_discount`——兩者會隨制度漂移。
 * 體驗預約的舊制（2026-04-11 `2e1da44` ~ `abae014`）是 100:1，且帳本扣的是
 * `points_used`（3300），而 `points_discount` 只有 33。照 `points_discount`
 * 退就會吞掉客人 99% 的點數。新制 1:1 之後三者才一致。
 *
 * 舊制的 redeem 記錄寫在 `order_id` 欄位（`d104048` 之後才改用 `booking_id`），
 * 舊制的退還記錄 type 是 `earn` 而非 `refund`，兩者都要納入計算。
 *
 * 應退 = floor(帳本已扣總額 × refundRate) − 已退總額。
 * 「減去已退」帶來冪等性：重複觸發時差額為 0，對被舊 bug 少退過的預約只補差額。
 *
 * @returns 實際退還的點數（0 代表無需退還）
 */
export async function refundBookingPoints(params: {
  userId: string;
  bookingId: string;
  refundRate: number; // 0 ~ 1
  description?: string;
}): Promise<number> {
  const { userId, bookingId, refundRate, description } = params;
  if (refundRate <= 0) return 0;

  const { data: rows } = await supabase
    .from("point_transactions")
    .select("points, type, description")
    .or(`booking_id.eq.${bookingId},order_id.eq.${bookingId}`);

  if (!rows || rows.length === 0) return 0;

  let deducted = 0;
  let alreadyRefunded = 0;
  for (const r of rows as { points: number; type: string; description: string | null }[]) {
    if (r.type === "redeem") {
      deducted += -r.points;
    } else if (r.type === "refund") {
      alreadyRefunded += r.points;
    } else if (r.type === "earn" && (r.description ?? "").includes("取消退還")) {
      // 舊制的退還記錄誤寫成 earn，仍屬已退，不可重複發
      alreadyRefunded += r.points;
    }
  }

  const target = Math.floor(deducted * refundRate);
  const outstanding = target - alreadyRefunded;
  if (outstanding <= 0) return 0;

  await refundPoints({
    userId,
    points: outstanding,
    bookingId,
    description: description ?? "體驗預約取消退還點數",
  });

  return outstanding;
}

// ─── 更新年消費 + 自動升等（atomic increment 避免 race condition）────────────

async function updateMembershipSpend(userId: string, amount: number) {
  // 使用 RPC atomic increment，避免併發訂單導致 annual_spend 少加
  const { data: result, error: rpcError } = await supabase.rpc("increment_annual_spend", {
    p_user_id: userId,
    p_amount: amount,
  });

  // Fallback: 如果 RPC 不存在（尚未部署 migration），使用舊邏輯
  if (rpcError) {
    const { data: existing } = await supabase
      .from("user_membership")
      .select("annual_spend, tier_id")
      .eq("user_id", userId)
      .single();

    const currentSpend = (existing?.annual_spend ?? 0) + amount;

    if (existing) {
      await supabase
        .from("user_membership")
        .update({ annual_spend: currentSpend, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await supabase.from("user_membership").insert({
        user_id: userId,
        tier_id: "standard",
        annual_spend: currentSpend,
      });
    }

    const upgradeResult = await checkAndUpgradeTier(userId, currentSpend, existing?.tier_id ?? "standard");
    if (upgradeResult.upgraded) await trySendUpgradeEmail(userId, upgradeResult);
    return;
  }

  // RPC 回傳 new_spend 和 current_tier_id
  const newSpend = result?.new_spend ?? amount;
  const currentTierId = result?.current_tier_id ?? "standard";
  const upgradeResult = await checkAndUpgradeTier(userId, newSpend, currentTierId);
  if (upgradeResult.upgraded) await trySendUpgradeEmail(userId, upgradeResult);
}

async function trySendUpgradeEmail(userId: string, upgrade: { newTierName?: string; pointsRate?: number; maxDiscountRate?: number }) {
  try {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", userId).single();
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) return;

    await sendTierUpgradeEmail({
      customerEmail: email,
      customerName: profile?.name ?? "會員",
      newTierName: upgrade.newTierName ?? "會員",
      pointsRate: upgrade.pointsRate ?? 0.02,
      maxDiscountRate: upgrade.maxDiscountRate ?? 0.10,
    });
  } catch (e) {
    console.error("[points] send tier upgrade email failed:", e);
  }
}

async function checkAndUpgradeTier(userId: string, currentSpend: number, currentTierId: string): Promise<{ upgraded: boolean; newTierId?: string; newTierName?: string; pointsRate?: number; maxDiscountRate?: number }> {
  const { data: tiers } = await supabase
    .from("member_tiers")
    .select("*")
    .order("min_annual_spend", { ascending: false });

  if (!tiers) return { upgraded: false };

  for (const tier of tiers) {
    if (currentSpend >= tier.min_annual_spend) {
      // 只升不降
      const currentTierData = tiers.find(t => t.id === currentTierId);
      if (!currentTierData || tier.min_annual_spend > currentTierData.min_annual_spend) {
        await supabase
          .from("user_membership")
          .update({ tier_id: tier.id, tier_upgraded_at: new Date().toISOString() })
          .eq("user_id", userId);

        // 記錄升等歷史
        await supabase.from("tier_history").insert({
          user_id: userId,
          from_tier: currentTierId,
          to_tier: tier.id,
          reason: "upgrade",
          triggered_by: "system",
        });

        return {
          upgraded: true,
          newTierId: tier.id,
          newTierName: tier.name,
          pointsRate: tier.points_rate,
          maxDiscountRate: tier.max_discount_rate,
        };
      }
      break;
    }
  }
  return { upgraded: false };
}
