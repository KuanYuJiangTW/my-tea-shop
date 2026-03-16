import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM    = process.env.RESEND_FROM_EMAIL ?? "霧抉茶 <onboarding@resend.dev>";
const ADMIN   = process.env.ADMIN_EMAIL       ?? "qdbzdt2846@gmail.com";

// ─── 共用型別 ─────────────────────────────────────────────────────────────────

export interface ShippingEmailData {
  orderId:       string;
  customerName:  string;
  customerEmail: string;
  shippingAddress: EmailOrderData["shippingAddress"];
  items:         EmailOrderData["items"];
  totalAmount:   number;
  trackingNote?: string;
}

export interface EmailOrderData {
  orderId:       string;
  customerName:  string;
  customerEmail: string;
  paymentMethod: "online" | "cod";
  shippingAddress: {
    type:       "home" | "cvs";
    city?:      string;
    address?:   string;
    company?:   string;
    storeName?: string;
  };
  items: {
    name:      string;
    quantity:  number;
    unitPrice: number;
    subtotal:  number;
  }[];
  shippingFee:  number;
  totalAmount:  number;
  note?:        string;
}

// ─── 入口：同時寄兩封 ────────────────────────────────────────────────────────

export async function sendOrderEmails(data: EmailOrderData) {
  await Promise.allSettled([
    sendCustomerEmail(data),
    sendAdminEmail(data),
  ]);
}

// ─── 輔助 ─────────────────────────────────────────────────────────────────────

const shortId = (id: string) => id.replace(/-/g, "").slice(0, 10).toUpperCase();

function formatShipping(addr: EmailOrderData["shippingAddress"]): string {
  if (addr.type === "home") return `宅配到府｜${addr.city ?? ""} ${addr.address ?? ""}`;
  const companyName: Record<string, string> = {
    seven: "7-ELEVEN", family: "全家", hilife: "萊爾富", ok: "OK 超商",
  };
  return `超商店到店｜${companyName[addr.company ?? ""] ?? addr.company} ${addr.storeName ?? ""}`;
}

function formatPayment(method: "online" | "cod"): string {
  return method === "online" ? "線上付款（綠界）" : "貨到付款";
}

function itemRows(items: EmailOrderData["items"]): string {
  return items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8e2d8;color:#3D4A42;">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e2d8;color:#3D4A42;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e2d8;color:#3D4A42;text-align:right;">NT$${i.unitPrice.toLocaleString()}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e2d8;color:#3D4A42;text-align:right;font-weight:600;">NT$${i.subtotal.toLocaleString()}</td>
    </tr>`).join("");
}

// ─── 出貨通知信 ───────────────────────────────────────────────────────────────

export async function sendShippingEmail(data: ShippingEmailData) {
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;">

          <div style="display:inline-block;background:#EBF3EE;color:#5C7A67;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">已出貨</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">您的茶葉已出發囉！</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${data.customerName}，您的訂單已完成出貨，請注意簽收。</p>

          <!-- 訂單資訊 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">訂單編號</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:700;text-align:right;font-family:monospace;">#${shortId(data.orderId)}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">配送方式</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${formatShipping(data.shippingAddress)}</td>
            </tr>
            ${data.trackingNote ? `<tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">備註</td>
              <td style="color:#7D9B84;font-size:13px;font-weight:600;text-align:right;">${data.trackingNote}</td>
            </tr>` : ""}
          </table>

          <!-- 品項明細 -->
          <h3 style="margin:0 0 12px;font-size:14px;color:#3D4A42;font-weight:700;">購買品項</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr style="border-bottom:2px solid #e8e2d8;">
              <th style="padding:8px 0;text-align:left;color:#6B7B6E;font-size:12px;font-weight:600;">品項</th>
              <th style="padding:8px 0;text-align:center;color:#6B7B6E;font-size:12px;font-weight:600;">數量</th>
              <th style="padding:8px 0;text-align:right;color:#6B7B6E;font-size:12px;font-weight:600;">小計</th>
            </tr>
            ${data.items.map(i => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e8e2d8;color:#3D4A42;">${i.name}</td>
              <td style="padding:10px 0;border-bottom:1px solid #e8e2d8;color:#3D4A42;text-align:center;">${i.quantity}</td>
              <td style="padding:10px 0;border-bottom:1px solid #e8e2d8;color:#3D4A42;text-align:right;font-weight:600;">NT$${i.subtotal.toLocaleString()}</td>
            </tr>`).join("")}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr style="border-top:2px solid #3D4A42;">
              <td style="color:#3D4A42;font-size:16px;font-weight:700;padding:12px 0 0;">總金額</td>
              <td style="color:#7D9B84;font-size:18px;font-weight:700;text-align:right;padding-top:12px;">NT$${data.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

          <div style="margin-top:32px;padding:20px;background:#F0F6F1;border-radius:10px;border-left:3px solid #7D9B84;">
            <p style="margin:0 0 6px;font-size:13px;color:#3D4A42;font-weight:600;">收貨注意事項</p>
            <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">宅配預計 1–3 個工作天送達；超商到店後請於 3 天內取件。如有任何問題，歡迎來電或傳訊息給我們。</p>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F5F0E8;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#7D9B84;font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:#9CA89E;">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:#9CA89E;">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from:    FROM,
    to:      data.customerEmail,
    subject: `【霧抉茶】您的訂單已出貨 #${shortId(data.orderId)}`,
    html,
  });
}

// ─── 顧客確認信 ───────────────────────────────────────────────────────────────

async function sendCustomerEmail(data: EmailOrderData) {
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;">

          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">感謝您的訂購！</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">您的訂單已成立，我們將盡快為您備貨。</p>

          <!-- 訂單資訊 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">訂單編號</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:700;text-align:right;font-family:monospace;">#${shortId(data.orderId)}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">付款方式</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${formatPayment(data.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">配送方式</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${formatShipping(data.shippingAddress)}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">預計出貨</td>
              <td style="color:#7D9B84;font-size:13px;font-weight:600;text-align:right;">3–5 個工作天</td>
            </tr>
          </table>

          <!-- 品項明細 -->
          <h3 style="margin:0 0 12px;font-size:14px;color:#3D4A42;font-weight:700;">購買品項</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr style="border-bottom:2px solid #e8e2d8;">
              <th style="padding:8px 0;text-align:left;color:#6B7B6E;font-size:12px;font-weight:600;">品項</th>
              <th style="padding:8px 0;text-align:center;color:#6B7B6E;font-size:12px;font-weight:600;">數量</th>
              <th style="padding:8px 0;text-align:right;color:#6B7B6E;font-size:12px;font-weight:600;">單價</th>
              <th style="padding:8px 0;text-align:right;color:#6B7B6E;font-size:12px;font-weight:600;">小計</th>
            </tr>
            ${itemRows(data.items)}
          </table>

          <!-- 金額合計 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">商品金額</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">NT$${(data.totalAmount - data.shippingFee).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">運費</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${data.shippingFee === 0 ? "免費" : `NT$${data.shippingFee.toLocaleString()}`}</td>
            </tr>
            <tr style="border-top:2px solid #3D4A42;margin-top:8px;">
              <td style="color:#3D4A42;font-size:16px;font-weight:700;padding:12px 0 0;">總金額</td>
              <td style="color:#7D9B84;font-size:18px;font-weight:700;text-align:right;padding-top:12px;">NT$${data.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

          ${data.note ? `<div style="margin-top:24px;padding:14px;background:#F5F0E8;border-radius:8px;font-size:13px;color:#6B7B6E;">備註：${data.note}</div>` : ""}

          <!-- 說明 -->
          <div style="margin-top:32px;padding:20px;background:#F0F6F1;border-radius:10px;border-left:3px solid #7D9B84;">
            <p style="margin:0 0 6px;font-size:13px;color:#3D4A42;font-weight:600;">出貨通知</p>
            <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">商品出貨後，我們會以簡訊或電話通知您取貨資訊。如有任何問題，歡迎來電或傳訊息給我們。</p>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F5F0E8;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#7D9B84;font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:#9CA89E;">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:#9CA89E;">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from:    FROM,
    to:      data.customerEmail,
    subject: `【霧抉茶】訂單確認 #${shortId(data.orderId)}`,
    html,
  });
}

// ─── 商家通知信 ───────────────────────────────────────────────────────────────

async function sendAdminEmail(data: EmailOrderData) {
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:#7D9B84;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:2px;">🍃 新訂單通知</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">霧抉茶後台</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;">

          <h2 style="margin:0 0 20px;font-size:18px;color:#3D4A42;">有新訂單進來了！</h2>

          <!-- 顧客資訊 -->
          <h3 style="margin:0 0 10px;font-size:13px;color:#7D9B84;font-weight:700;text-transform:uppercase;letter-spacing:1px;">顧客資訊</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;width:90px;">訂單編號</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:700;font-family:monospace;">#${shortId(data.orderId)}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">姓名</td>
              <td style="color:#3D4A42;font-size:13px;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">Email</td>
              <td style="color:#3D4A42;font-size:13px;">${data.customerEmail}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">付款</td>
              <td style="color:#3D4A42;font-size:13px;">${formatPayment(data.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">配送</td>
              <td style="color:#3D4A42;font-size:13px;">${formatShipping(data.shippingAddress)}</td>
            </tr>
            ${data.note ? `<tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">備註</td><td style="color:#e07b39;font-size:13px;font-weight:600;">${data.note}</td></tr>` : ""}
          </table>

          <!-- 品項 -->
          <h3 style="margin:0 0 10px;font-size:13px;color:#7D9B84;font-weight:700;text-transform:uppercase;letter-spacing:1px;">購買品項</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr style="border-bottom:2px solid #e8e2d8;">
              <th style="padding:8px 0;text-align:left;color:#6B7B6E;font-size:12px;">品項</th>
              <th style="padding:8px 0;text-align:center;color:#6B7B6E;font-size:12px;">數量</th>
              <th style="padding:8px 0;text-align:right;color:#6B7B6E;font-size:12px;">單價</th>
              <th style="padding:8px 0;text-align:right;color:#6B7B6E;font-size:12px;">小計</th>
            </tr>
            ${itemRows(data.items)}
          </table>

          <!-- 金額 -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:3px 0;">運費</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${data.shippingFee === 0 ? "免費" : `NT$${data.shippingFee.toLocaleString()}`}</td>
            </tr>
            <tr>
              <td style="color:#3D4A42;font-size:16px;font-weight:700;padding:10px 0 0;">應收總金額</td>
              <td style="color:#7D9B84;font-size:20px;font-weight:700;text-align:right;padding-top:10px;">NT$${data.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

        </td></tr>

        <tr><td style="background:#F5F0E8;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA89E;">請至 Supabase 後台查看完整訂單詳情</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `【新訂單】${data.customerName} 的訂單 #${shortId(data.orderId)}｜NT$${data.totalAmount.toLocaleString()}`,
    html,
  });
}
