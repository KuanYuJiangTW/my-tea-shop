import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { verifyTradeNo } from "../cvs-map/route";

// 綠界地圖選店完成後會 POST 回這裡，我們把結果 postMessage 回開啟者視窗。
//
// 安全重點：store 名稱／地址是回調帶進來的字串，不可信任。
// 舊寫法把 JSON.stringify(...) 直接字串插值進 inline <script>——JSON.stringify
// 不會轉義 `</script>`，攻擊者拿一組有效簽名的 MerchantTradeNo 自行 POST，
// 把 CVSStoreName 設成 `</script><script>…</script>` 就能突破標籤，在本站
// origin 下執行任意 JS。現在改為：資料只進 HTML 屬性（實體轉義），script 本身
// 不含任何外來資料，並以 nonce 授權、移除 'unsafe-inline'。

const MAX_FIELD_LEN = 200; // 綠界的店名／地址遠短於此，純為防呆

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const text = await req.text();
  const data = Object.fromEntries(new URLSearchParams(text));

  // 驗證 MerchantTradeNo 簽名（防偽造 callback）
  const tradeNo = data.MerchantTradeNo ?? "";
  if (!verifyTradeNo(tradeNo)) {
    return new Response("Invalid or expired request", { status: 403 });
  }

  const storeId   = (data.CVSStoreID   ?? "").slice(0, MAX_FIELD_LEN);
  const storeName = (data.CVSStoreName ?? "").slice(0, MAX_FIELD_LEN);
  const address   = (data.CVSAddress   ?? "").slice(0, MAX_FIELD_LEN);

  const base    = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const payload = JSON.stringify({ type: "cvs-selected", storeId, storeName, address });
  const nonce   = randomBytes(16).toString("base64");

  const html = `<!doctype html><html><body>
<div id="cvs-result" data-payload="${escapeHtmlAttr(payload)}" data-origin="${escapeHtmlAttr(base)}"></div>
<script nonce="${nonce}">
  (function () {
    var el = document.getElementById('cvs-result');
    if (window.opener) {
      window.opener.postMessage(JSON.parse(el.dataset.payload), el.dataset.origin);
    }
    window.close();
  })();
<\/script></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        `script-src 'nonce-${nonce}'; object-src 'none'; base-uri 'none'`,
    },
  });
}
