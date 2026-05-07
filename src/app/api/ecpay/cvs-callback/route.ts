import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const text = await req.text();
  const data = Object.fromEntries(new URLSearchParams(text));

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
