import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";

type Params = { params: Promise<{ id: string }> };

/** 內部備註。**MUST NOT 出現在任何客人端回應或信件**——電話聊完的結論寫這裡 */
export const PATCH = withAdminAuth(async (req: NextRequest, ctx?: unknown) => {
  const { id } = await (ctx as Params).params;
  const { note } = await req.json().catch(() => ({}));

  if (note !== null && (typeof note !== "string" || note.length > 2000)) {
    return NextResponse.json({ error: "備註格式不正確或過長" }, { status: 400 });
  }

  const { error } = await supabase
    .from("experience_requests")
    .update({ admin_note: note || null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}, "note_experience_request");
