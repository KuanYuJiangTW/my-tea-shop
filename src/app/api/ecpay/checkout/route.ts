import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// 綠界測試環境金鑰
const HASH_KEY = "5294y06JbISpM5x9";
const HASH_IV = "v77hoKGq4kWxNNIS";
const MERCHANT_ID = "2000132";
const ECPAY_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/index";

// 仿 PHP urlencode（綠界 CheckMacValue 規範）
function phpUrlencode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function generateCheckMacValue(params: Record<string, string>): string {
  // 依 key 字母排序
  const sorted = Object.keys(params)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const raw = `HashKey=${HASH_KEY}&${sorted}&HashIV=${HASH_IV}`;
  const encoded = phpUrlencode(raw).toLowerCase();
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, totalPrice, customer } = body;

  const host = req.headers.get("origin") || "http://localhost:3000";

  // 商品名稱（綠界格式：商品A#商品B）
  const itemName = items
    .map((item: { name: string; quantity: number }) => `${item.name} x${item.quantity}`)
    .join("#");

  // 唯一交易編號（20碼以內，只能英數字）
  const merchantTradeNo = `TEA${Date.now()}`.slice(0, 20);

  // 交易時間
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const merchantTradeDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: merchantTradeDate,
    PaymentType: "aio",
    TotalAmount: String(totalPrice),
    TradeDesc: "霧抉茶訂單",
    ItemName: itemName,
    ReturnURL: `${host}/api/ecpay/return`,
    OrderResultURL: `${host}/api/ecpay/result`,
    ChoosePayment: "ALL",
    EncryptType: "1",
    // 帶回自訂資料
    CustomField1: customer?.name || "",
    CustomField2: customer?.email || "",
  };

  params.CheckMacValue = generateCheckMacValue(params);

  return NextResponse.json({ ecpayUrl: ECPAY_URL, params });
}
