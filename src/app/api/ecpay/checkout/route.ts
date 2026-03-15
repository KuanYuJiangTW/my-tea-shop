import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const HASH_KEY = "5294y06JbISpM5x9";
const HASH_IV = "v77hoKGq4kWxNNIS";
const MERCHANT_ID = "2000132";
const ECPAY_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/index";

// 仿 PHP urlencode（綠界 CheckMacValue 規範）
function phpUrlencode(str: string): string {
  return encodeURIComponent(str).replace(/%20/g, "+");
}

function generateCheckMacValue(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const raw = `HashKey=${HASH_KEY}&${sorted}&HashIV=${HASH_IV}`;
  const encoded = phpUrlencode(raw).toLowerCase();
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, totalPrice } = body;

  // 使用 VERCEL_URL 環境變數（Vercel 自動注入），fallback 到 request host
  const host = process.env.NEXT_PUBLIC_BASE_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // 商品名稱（只用英文避免編碼問題）
  const itemName = items
    .map((item: { name: string; quantity: number }) => `${item.name} x${item.quantity}`)
    .join("#")
    .slice(0, 200); // 綠界上限 200 字

  // 唯一交易編號（20碼以內，只能英數字）
  const merchantTradeNo = `T${Date.now()}`.slice(0, 20);

  // 交易時間（台灣時間）
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const merchantTradeDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: merchantTradeDate,
    PaymentType: "aio",
    TotalAmount: String(Math.round(totalPrice)),
    TradeDesc: "WuJue-Tea-Order",
    ItemName: itemName,
    ReturnURL: `${host}/api/ecpay/return`,
    OrderResultURL: `${host}/api/ecpay/result`,
    ChoosePayment: "ALL",
    EncryptType: "1",
  };

  params.CheckMacValue = generateCheckMacValue(params);

  return NextResponse.json({ ecpayUrl: ECPAY_URL, params });
}
