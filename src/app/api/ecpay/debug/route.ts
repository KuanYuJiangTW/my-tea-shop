import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const HASH_KEY = "5294y06JbISpM5x9";
const HASH_IV = "v77hoKGq4kWxNNIS";
const MERCHANT_ID = "2000132";

function phpUrlencode(str: string): string {
  return encodeURIComponent(str).replace(/%20/g, "+");
}

function generateCheckMacValue(params: Record<string, string>) {
  const sorted = Object.keys(params)
    .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const raw = `HashKey=${HASH_KEY}&${sorted}&HashIV=${HASH_IV}`;
  const encoded = phpUrlencode(raw).toLowerCase();
  const checkMacValue = createHash("sha256").update(encoded).digest("hex").toUpperCase();

  return { raw, encoded, checkMacValue };
}

export async function GET(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = `${proto}://${req.headers.get("x-forwarded-host") || req.nextUrl.host}`;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const merchantTradeDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: `T${Date.now()}`.slice(0, 20),
    MerchantTradeDate: merchantTradeDate,
    PaymentType: "aio",
    TotalAmount: "100",
    TradeDesc: "WuJue-Tea-Order",
    ItemName: "Test x1",
    ReturnURL: `${host}/api/ecpay/return`,
    OrderResultURL: `${host}/api/ecpay/result`,
    ChoosePayment: "ALL",
    EncryptType: "1",
  };

  const { raw, encoded, checkMacValue } = generateCheckMacValue(params);

  return NextResponse.json({
    host,
    params: { ...params, CheckMacValue: checkMacValue },
    debug: { raw, encoded },
  }, { status: 200 });
}
