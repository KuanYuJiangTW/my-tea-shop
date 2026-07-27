import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

export const GET = withAdminAuth(async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
