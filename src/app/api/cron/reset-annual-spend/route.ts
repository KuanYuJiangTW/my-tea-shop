import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Vercel Cron: 每年 1 月 1 日 00:00 UTC 執行
// 重置所有用戶的年消費，依新年消費重新計算等級

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 嘗試使用批次 RPC（效能較佳）
  const { data: rpcResult, error: rpcError } = await supabase.rpc("batch_annual_reset");

  if (!rpcError) {
    // RPC 回傳降等記錄，寫入 tier_history
    const downgrades = rpcResult as Array<{ user_id: string; old_tier: string; new_tier: string }> | null;
    for (const d of downgrades ?? []) {
      await supabase.from("tier_history").insert({
        user_id: d.user_id,
        from_tier: d.old_tier,
        to_tier: d.new_tier,
        reason: "annual_reset",
        triggered_by: "cron",
      });
    }

    console.log(`[cron] reset-annual-spend (RPC): ${downgrades?.length ?? 0} downgrades`);
    return NextResponse.json({ ok: true, mode: "rpc", downgrades: downgrades?.length ?? 0 });
  }

  // Fallback: 逐筆處理（RPC 尚未部署時）
  console.warn("[cron] batch_annual_reset RPC not available, using fallback");

  const { data: memberships, error } = await supabase
    .from("user_membership")
    .select("user_id, tier_id, annual_spend");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: tiers } = await supabase
    .from("member_tiers")
    .select("id, min_annual_spend")
    .order("min_annual_spend", { ascending: false });

  if (!tiers) {
    return NextResponse.json({ error: "無法取得等級設定" }, { status: 500 });
  }

  const results = { reset: 0, downgraded: 0, maintained: 0, errors: 0 };

  for (const m of memberships ?? []) {
    let newTierId = "standard";
    for (const tier of tiers) {
      if (m.annual_spend >= tier.min_annual_spend) {
        newTierId = tier.id;
        break;
      }
    }

    const currentTierIdx = tiers.findIndex(t => t.id === m.tier_id);
    const newTierIdx = tiers.findIndex(t => t.id === newTierId);

    const update: Record<string, unknown> = {
      annual_spend: 0,
      annual_reset_at: new Date().toISOString(),
    };

    if (newTierIdx > currentTierIdx) {
      update.tier_id = newTierId;
      results.downgraded++;
    } else {
      results.maintained++;
    }

    const { error: updateError } = await supabase
      .from("user_membership")
      .update(update)
      .eq("user_id", m.user_id);

    if (updateError) {
      console.error(`[cron] reset annual spend failed for ${m.user_id}:`, updateError.message);
      results.errors++;
    } else {
      results.reset++;
      if (newTierIdx > currentTierIdx) {
        await supabase.from("tier_history").insert({
          user_id: m.user_id,
          from_tier: m.tier_id,
          to_tier: newTierId,
          reason: "annual_reset",
          triggered_by: "cron",
        });
      }
    }
  }

  console.log("[cron] reset-annual-spend (fallback) result:", results);
  return NextResponse.json({ ok: true, mode: "fallback", results });
}
