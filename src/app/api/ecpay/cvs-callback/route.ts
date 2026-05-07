import { NextRequest } from "next/server";
import { verifyAndConsumeNonce } from "../cvs-map/route";

export async function POST(req: NextRequest) {
  const text = await req.text();
  const data = Object.fromEntries(new URLSearchParams(text));

  // 驗證 MerchantTradeNo 是我們產生的（防偽造 callback）
  const tradeNo = data.MerchantTradeNo ?? "";
  if (!verifyAndConsumeNonce(tradeNo)) {
    return new Response("Invalid or expired request", { status: 403 });
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
