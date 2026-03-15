import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const HASH_KEY  = process.env.ECPAY_HASH_KEY  || "5294y06JbISpM5x9";
const HASH_IV   = process.env.ECPAY_HASH_IV   || "v77hoKGq4kWxNNIS";
const MERCHANT  = process.env.ECPAY_MERCHANT_ID || "2000132";
const ECPAY_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/index";

/** PHP urlencode — 與綠界規範完全一致 */
function phpUrlencode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/!/g,   "%21")
    .replace(/'/g,   "%27")
    .replace(/\(/g,  "%28")
    .replace(/\)/g,  "%29")
    .replace(/\*/g,  "%2A")
    .replace(/~/g,   "%7E");
}

function buildCheckMacValue(params: Record<string, string>): string {
  const chain = Object.keys(params)
    .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
    .map(k => `${k}=${params[k]}`)
    .join("&");

  const raw     = `HashKey=${HASH_KEY}&${chain}&HashIV=${HASH_IV}`;
  const encoded = phpUrlencode(raw).toLowerCase();
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  const { items, totalPrice } = await req.json() as {
    items: { name: string; quantity: number }[];
    totalPrice: number;
  };

  // 取得站台根網址（Vercel 會注入 x-forwarded-* headers）
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host  = req.headers.get("x-forwarded-host")  ?? req.nextUrl.host;
  const base  = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;

  const pad  = (n: number) => String(n).padStart(2, "0");
  const now  = new Date();
  const date = `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} `
             + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // 商品名稱：只留英數字與空格，避免編碼問題
  const itemName = items
    .map(i => `${i.name} x${i.quantity}`)
    .join("#")
    .slice(0, 200);

  const tradeNo = `T${Date.now()}`.slice(0, 20);

  const params: Record<string, string> = {
    ChoosePayment:     "ALL",
    EncryptType:       "1",
    ItemName:          itemName,
    MerchantID:        MERCHANT,
    MerchantTradeDate: date,
    MerchantTradeNo:   tradeNo,
    OrderResultURL:    `${base}/api/ecpay/result`,
    PaymentType:       "aio",
    ReturnURL:         `${base}/api/ecpay/return`,
    TotalAmount:       String(Math.round(totalPrice)),
    TradeDesc:         "WuJue-Tea",
  };

  params.CheckMacValue = buildCheckMacValue(params);

  // 建立 HTML 自動提交表單（比 JS 動態建立更穩定）
  const fields = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8"><title>導向綠界付款...</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555">
  正在跳轉至綠界付款頁面，請稍候...
</p>
<form id="ecpay" action="${ECPAY_URL}" method="POST">
${fields}
</form>
<script>document.getElementById("ecpay").submit();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
