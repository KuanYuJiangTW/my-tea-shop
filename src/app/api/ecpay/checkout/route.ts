import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import type { EcpayCheckoutRequest, EcpayCheckoutResponse } from "@/types";

const MERCHANT  = process.env.ECPAY_MERCHANT_ID!;
const HASH_KEY  = process.env.ECPAY_HASH_KEY!;
const HASH_IV   = process.env.ECPAY_HASH_IV!;
const ECPAY_URL = "https://payment.ecpay.com.tw/Cashier/AioCheckout/index";

function phpUrlencode(input: string): string {
  const SAFE = /^[A-Za-z0-9\-_.]$/;
  let out = "";
  for (const char of input) {
    if (char === " ")        out += "+";
    else if (SAFE.test(char)) out += char;
    else                      out += encodeURIComponent(char);
  }
  return out;
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

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";

type ProductRow = {
  id:              number;
  name:            string;
  price:           number;
  price_75g:       number | null;
  price_tea_bag:   number | null;
  stock_quantity:  number | null;
  stock_75g:       number | null;
  stock_tea_bag:   number | null;
};

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  if (origin && origin !== ALLOWED_ORIGIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as EcpayCheckoutRequest;

  // ── 1. 後端查詢真實價格，完全不信任前端傳來的金額 ──────────────────────
  const productIds = body.items.map(i => i.productId);
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, price, price_75g, price_tea_bag, stock_quantity, stock_75g, stock_tea_bag")
    .in("id", productIds) as { data: ProductRow[] | null; error: unknown };

  if (productError || !products) {
    return NextResponse.json({ error: "查詢商品失敗" }, { status: 500 });
  }

  // ── 2. 驗證每筆商品：存在、數量合法、庫存充足 ───────────────────────────
  type ValidatedItem = { productId: number; name: string; quantity: number; unitPrice: number; subtotal: number };
  const validatedItems: ValidatedItem[] = [];

  for (const reqItem of body.items) {
    const product = products.find(p => p.id === reqItem.productId);
    if (!product) {
      return NextResponse.json({ error: `商品不存在：${reqItem.productId}` }, { status: 400 });
    }

    const qty = reqItem.quantity;
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: "數量必須為正整數" }, { status: 400 });
    }

    const spec = reqItem.spec ?? "150g";
    let unitPrice: number;
    let stock: number | null;

    if (spec === "75g") {
      if (!product.price_75g) return NextResponse.json({ error: `商品無 75g 規格：${product.name}` }, { status: 400 });
      unitPrice = product.price_75g;
      stock = product.stock_75g;
    } else if (spec === "teabag") {
      if (!product.price_tea_bag) return NextResponse.json({ error: `商品無茶包規格：${product.name}` }, { status: 400 });
      unitPrice = product.price_tea_bag;
      stock = product.stock_tea_bag;
    } else {
      unitPrice = product.price;
      stock = product.stock_quantity;
    }

    if (stock !== null && stock < qty) {
      return NextResponse.json({ error: `庫存不足：${product.name}` }, { status: 400 });
    }

    validatedItems.push({ productId: product.id, name: product.name, quantity: qty, unitPrice, subtotal: unitPrice * qty });
  }

  // ── 3. 後端計算運費與總金額 ──────────────────────────────────────────────
  const subtotal    = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const shippingFee = subtotal >= 1000 ? 0 : body.deliveryType === "home" ? 250 : 60;
  const totalAmount = subtotal + shippingFee;

  // 取得當前登入的 user_id（若有登入）
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  const userId = user?.id ?? null;

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.nextUrl.host}`;

  const pad  = (n: number) => String(n).padStart(2, "0");
  const now  = new Date();
  const date = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
               `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const tradeNo  = `T${Date.now()}`.slice(0, 20);
  const itemName = validatedItems.map(i => `${i.name} x${i.quantity}`).join("#").slice(0, 200);

  // 建立 pending 訂單
  const shippingAddress =
    body.deliveryType === "home"
      ? { type: "home", city: body.shippingAddress?.city, address: body.shippingAddress?.address }
      : { type: "cvs",  company: body.cvsInfo?.company,   storeName: body.cvsInfo?.storeName };

  const { error: dbError } = await supabase.from("orders").insert({
    customer_name:    body.customer.name,
    customer_email:   body.customer.email,
    customer_phone:   body.customer.phone,
    payment_method:   "online",
    shipping_address: shippingAddress,
    items:            validatedItems,
    shipping_fee:     shippingFee,
    total_amount:     totalAmount,
    order_status:     "new",
    payment_status:   "pending",
    ecpay_trade_no:   tradeNo,
    note:             body.note ?? null,
    user_id:          userId,
  });

  if (dbError) console.error("建立訂單失敗:", dbError);

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
    TotalAmount:       String(Math.round(totalAmount)),
    TradeDesc:         "WuJueTea",
  };

  params.CheckMacValue = buildCheckMacValue(params);

  return NextResponse.json(
    { ecpayUrl: ECPAY_URL, params } satisfies EcpayCheckoutResponse,
    {
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}

// preflight
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
