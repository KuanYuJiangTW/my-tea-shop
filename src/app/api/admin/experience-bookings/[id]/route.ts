import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/experience-bookings/[id]
// body: { refund_status: "processed" }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const { error } = await supabase
    .from("experience_bookings")
    .update({ refund_status: body.refund_status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
