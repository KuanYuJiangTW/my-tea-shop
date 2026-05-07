import { supabase } from "@/lib/supabase";
import { sendOrderEmails, type EmailOrderData } from "@/lib/email";

// ─── PayPal 環境設定 ────────────────────────────────────────────────────────

const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// ─── Access Token 快取 ──────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // 提前 60 秒過期
  return cachedToken!;
}

// ─── PayPal API 呼叫 ────────────────────────────────────────────────────────

export async function paypalFetch(path: string, options: RequestInit = {}) {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

// ─── 建立 PayPal Order ──────────────────────────────────────────────────────

export async function createPayPalOrder(
  totalAmount: number,
  orderId: string,
  returnUrl: string,
  cancelUrl: string,
): Promise<{ paypalOrderId: string; approveUrl: string }> {
  const res = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          amount: {
            currency_code: "TWD",
            value: totalAmount.toString(),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: returnUrl,
            cancel_url: cancelUrl,
            user_action: "PAY_NOW",
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create order failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const approveLink = data.links?.find(
    (l: { rel: string; href: string }) => l.rel === "payer-action",
  );

  if (!approveLink) {
    throw new Error("PayPal approve URL not found in response");
  }

  return { paypalOrderId: data.id, approveUrl: approveLink.href };
}

// ─── Capture PayPal Order ───────────────────────────────────────────────────

export async function capturePayPalOrder(paypalOrderId: string) {
  const res = await paypalFetch(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture failed: ${res.status} ${text}`);
  }

  return await res.json();
}

// ─── Webhook 簽章驗證 ───────────────────────────────────────────────────────

export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const res = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

// ─── 共用 Capture 處理函式（冪等） ──────────────────────────────────────────

export async function processPayPalCapture(
  dbOrderId: string,
  paypalOrderId: string,
): Promise<{ success: boolean; alreadyProcessed?: boolean }> {
  // 1. 檢查訂單狀態（冪等：已 paid 直接回傳成功）
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id, payment_status, items, customer_name, customer_email, shipping_address, shipping_fee, total_amount, note")
    .eq("id", dbOrderId)
    .single();

  if (fetchErr || !order) {
    throw new Error(`Order not found: ${dbOrderId}`);
  }

  if (order.payment_status === "paid") {
    return { success: true, alreadyProcessed: true };
  }

  // 2. Capture PayPal Order
  const captureData = await capturePayPalOrder(paypalOrderId);
  const captureStatus = captureData.status;

  if (captureStatus !== "COMPLETED") {
    throw new Error(`PayPal capture status: ${captureStatus}`);
  }

  // 3. 更新訂單狀態（用 payment_status = "pending" 條件確保冪等）
  const { data: updated, error: updateErr } = await supabase
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", dbOrderId)
    .eq("payment_status", "pending")
    .select("*")
    .single();

  if (updateErr || !updated) {
    // 可能是競態已被另一方處理
    return { success: true, alreadyProcessed: true };
  }

  // 4. 扣庫存（原子性）
  const orderItems = updated.items as { productId: number; quantity: number; spec: string }[];
  const decrementResults = await Promise.all(
    orderItems.map((item) =>
      supabase.rpc("decrement_stock", {
        p_id: item.productId,
        qty: item.quantity,
        spec: item.spec ?? "150g",
      }),
    ),
  );

  const stockFailed = decrementResults.some((r) => r.data === false || r.error);
  if (stockFailed) {
    await supabase.from("orders").update({ order_status: "stock_issue" }).eq("id", dbOrderId);
    console.error("PayPal capture succeeded but stock deduction failed, order needs manual review:", dbOrderId);
  }

  // 5. 寄送訂單確認信
  const emailData: EmailOrderData = {
    orderId: updated.id,
    customerName: updated.customer_name,
    customerEmail: updated.customer_email,
    paymentMethod: "paypal",
    shippingAddress: updated.shipping_address,
    items: updated.items,
    shippingFee: updated.shipping_fee,
    totalAmount: updated.total_amount,
    note: updated.note ?? undefined,
  };
  await sendOrderEmails(emailData);

  return { success: true };
}
