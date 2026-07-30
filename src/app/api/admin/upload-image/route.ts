import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/admin-auth-guard";
import { detectImageKind, mimeForKind, extForKind } from "@/lib/image-magic";

const BUCKET    = "product-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT  = new Set(["jpg", "jpeg", "png", "webp"]);

export const POST = withAdminAuth(async (req: NextRequest) => {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "無效的請求格式" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const slug = formData.get("slug") as string | null;

  if (!file || !slug) {
    return NextResponse.json({ error: "缺少 file 或 slug" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "圖片不能超過 5MB" }, { status: 400 });
  }

  // 第一關：MIME 與副檔名白名單（兩者皆由客端提供，只能當初篩）
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_MIME.has(file.type) || !ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "只允許上傳 JPG、PNG、WebP 格式的圖片" }, { status: 400 });
  }

  // 第二關：實際檔頭。客端可以把任意檔案改名並宣告成 image/png，但改不了內容本身。
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const kind = detectImageKind(header);
  if (!kind) {
    return NextResponse.json({ error: "檔案內容不是有效的圖片" }, { status: 400 });
  }
  if (mimeForKind(kind) !== file.type) {
    return NextResponse.json({ error: "檔案內容與宣告的格式不符" }, { status: 400 });
  }

  // 路徑與 contentType 一律採用檔頭判定的結果，不沿用客端提供的值
  const safeExt = extForKind(kind);
  const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: mimeForKind(kind), upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl });
});
