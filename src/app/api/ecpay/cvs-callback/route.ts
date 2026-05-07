import { createHash } from "crypto";
import { NextRequest } from "next/server";

const HASH_KEY = process.env.ECPAY_LOGISTICS_HASH_KEY!;
const HASH_IV  = process.env.ECPAY_LOGISTICS_HASH_IV!;

function phpUrlencode(input: string): string {
  const SAFE = /^[A-Za-z0-9\-_.]$/;
  let out = "";
  for (const char of input) {
    if (char === " ")         out += "+";
    else if (SAFE.test(char)) out += char;
    else                      out += encodeURIComponent(char);
  }
  return out;
}

function verifyCheckMacValue(params: Record<string, string>): boolean {
  const { CheckMacValue, ...rest } = params;
  if (!CheckMacValue) {
    console.error("[cvs-callback] Missing CheckMacValue");
    return false;
  }
  if (!HASH_KEY || !HASH_IV) {
    console.error("[cvs-callback] Missing HASH_KEY or HASH_IV");
    return false;
  }

  const chain = Object.keys(rest)
    .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
    .map(k => `${k}=${rest[k]}`)
    .join("&");
  const raw     = `HashKey=${HASH_KEY}&${chain}&HashIV=${HASH_IV}`;
  const encoded = phpUrlencode(raw).toLowerCase();

  const md5    = createHash("md5").update(encoded).digest("hex").toUpperCase();
  const sha256 = createHash("sha256").update(encoded).digest("hex").toUpperCase();

  console.log("[cvs-callback] Received CheckMacValue:", CheckMacValue);
  console.log("[cvs-callback] Computed MD5:           ", md5);
  console.log("[cvs-callback] Computed SHA256:         ", sha256);
  console.log("[cvs-callback] MD5 match:", md5 === CheckMacValue);
  console.log("[cvs-callback] SHA256 match:", sha256 === CheckMacValue);
  console.log("[cvs-callback] Params keys:", Object.keys(rest).join(", "));
  console.log("[cvs-callback] Raw string (first 200):", raw.slice(0, 200));

  return md5 === CheckMacValue || sha256 === CheckMacValue;
}

export async function POST(req: NextRequest) {
  const text = await req.text();
  const data = Object.fromEntries(new URLSearchParams(text));

  console.log("[cvs-callback] Received data keys:", Object.keys(data).join(", "));

  if (!verifyCheckMacValue(data)) {
    return new Response("CheckMacValue Error", { status: 400 });
  }

  const storeId   = data.CVSStoreID   ?? "";
  const storeName = data.CVSStoreName ?? "";
  const address   = data.CVSAddress   ?? "";

  const base    = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const payload = JSON.stringify({ type: "cvs-selected", storeId, storeName, address });

  const html = `<!doctype html><html><body><script>
    if (window.opener) {
      window.opener.postMessage(${payload}, '${base}');
    }
    window.close();
  <\/script></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
