import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { getValidBalance, getUserTier } from "@/lib/points";

export async function GET() {
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  // 查詢有效餘額（排除過期點數）
  const balance = await getValidBalance(user.id);

  // 查詢用戶等級
  const tier = await getUserTier(user.id);

  // 查詢最近交易記錄（顯示用，不限數量但合理限制）
  const { data: transactions } = await supabase
    .from("point_transactions")
    .select("id, points, type, description, created_at, expires_at, multiplier")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    balance,
    tier: {
      id: tier.id,
      name: tier.name,
      points_rate: tier.points_rate,
      max_discount_rate: tier.max_discount_rate,
    },
    transactions: transactions ?? [],
  });
}
