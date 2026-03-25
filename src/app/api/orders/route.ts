import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { sendOrderEmails } from "@/lib/email";
import type { CreateOrderRequest } from "@/types";

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
  const body = await req.json() as CreateOrderRequest;

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
    if (spec !== "150g" && spec !== "75g" && spec !== "teabag") {
      return NextResponse.json({ error: `無效的規格：${spec}` }, { status: 400 });
    }
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

  // ── 4. 驗證 token，未登入直接拒絕 ──────────────────────────────────────
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
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const userId = user.id;
  // email 以 token 為準，防止前端傳入他人信箱
  const verifiedEmail = user.email!;

  const shippingAddress =
    body.deliveryType === "home"
      ? { type: "home", city: body.shippingAddress?.city, address: body.shippingAddress?.address }
      : { type: "cvs",  company: body.cvsInfo?.company,   storeName: body.cvsInfo?.storeName };

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name:    body.customer.name,
      customer_email:   verifiedEmail,
      customer_phone:   body.customer.phone,
      payment_method:   body.paymentMethod,
      shipping_address: shippingAddress,
      items:            validatedItems,
      shipping_fee:     shippingFee,
      total_amount:     totalAmount,
      order_status:     "new",
      payment_status:   "pending",
      note:             body.note ?? null,
      user_id:          userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("建立訂單失敗:", error);
    return NextResponse.json({ error: "建立訂單失敗" }, { status: 500 });
  }

  // 扣除庫存（貨到付款，下單即確認）
  await Promise.all(
    validatedItems.map((item) =>
      supabase.rpc("decrement_stock", { p_id: item.productId, qty: item.quantity })
    )
  );

  // 寄送訂單確認信
  await sendOrderEmails({
    orderId:         data.id,
    customerName:    body.customer.name,
    customerEmail:   verifiedEmail,
    paymentMethod:   body.paymentMethod,
    shippingAddress: shippingAddress as Parameters<typeof sendOrderEmails>[0]["shippingAddress"],
    items:           validatedItems,
    shippingFee,
    totalAmount,
    note:            body.note,
  });

  return NextResponse.json({ orderId: data.id });
}
