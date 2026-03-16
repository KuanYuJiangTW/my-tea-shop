import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { EcpayCheckoutRequest, EcpayCheckoutResponse } from "@/types";

const MERCHANT  = process.env.ECPAY_MERCHANT_ID  ?? "2000132";
const HASH_KEY  = process.env.ECPAY_HASH_KEY      ?? "5294y06JbISpM5x9";
const HASH_IV   = process.env.ECPAY_HASH_IV       ?? "v77hoKGq4kWxNNIS";
const ECPAY_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/index";

/**
 * 完全對應 PHP urlencode：
 * 只保留英數字、- _ . 不編碼，空格→+，其餘全部 %XX
 */
function phpUrlencode(input: string): string {
  const SAFE = /^[A-Za-z0-9\-_.]$/;
  let out = "";
  for (const char of input) {
    if (char === " ") {
      out += "+";
    } else if (SAFE.test(char)) {
      out += char;
    } else {
      // encodeURIComponent 處理 ASCII 特殊字元與多位元組（中文）
      out += encodeURIComponent(char);
    }
  }
  return out;
}

function buildCheckMacValue(params: Record<string, string>): string {
  // 依 key 大小寫不分字母順序排序（PHP ksort 行為）
  const chain = Object.keys(params)
    .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
    .map(k => `${k}=${params[k]}`)
    .join("&");

  const raw     = `HashKey=${HASH_KEY}&${chain}&HashIV=${HASH_IV}`;
  const encoded = phpUrlencode(raw).toLowerCase();
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  const { items, totalPrice } = await req.json() as EcpayCheckoutRequest;

  // 取得正確的對外網址
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.nextUrl.host}`;

  const pad  = (n: number) => String(n).padStart(2, "0");
  const now  = new Date();
  const date = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
               `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const tradeNo  = `T${Date.now()}`.slice(0, 20);
  const itemName = items.map(i => `${i.name} x${i.quantity}`).join("#").slice(0, 200);

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
    TradeDesc:         "WuJueTea",
  };

  params.CheckMacValue = buildCheckMacValue(params);

  return NextResponse.json({ ecpayUrl: ECPAY_URL, params } satisfies EcpayCheckoutResponse);
}
