import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/campaigns/[id]/history — 變更歷史
export const GET = withAdminAuth(async (_req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;

  const { data, error } = await supabase
    .from("campaign_audit_log")
    .select("*")
    .eq("campaign_id", id)
    .order("changed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
});
