import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/reviews/[id]
// body: { is_visible: boolean }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { is_visible } = await req.json();

  const { error } = await supabase
    .from("experience_reviews")
    .update({ is_visible })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
