import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM    = process.env.RESEND_FROM_EMAIL ?? "霧抉茶 <noreply@taiwantea.store>";
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
  paymentMethod: "online" | "cod" | "paypal";
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

/** 防止用戶輸入內容在 HTML email 中造成 HTML injection */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatShipping(addr: EmailOrderData["shippingAddress"]): string {
  if (addr.type === "home") {
    return `宅配到府｜${escapeHtml(addr.city ?? "")} ${escapeHtml(addr.address ?? "")}`;
  }
  const companyName: Record<string, string> = {
    seven: "7-ELEVEN", family: "全家", hilife: "萊爾富", ok: "OK 超商",
  };
  const company   = companyName[addr.company ?? ""] ?? escapeHtml(addr.company ?? "");
  const storeName = escapeHtml(addr.storeName ?? "");
  return `超商店到店｜${company} ${storeName}`;
}

function formatPayment(method: "online" | "cod" | "paypal"): string {
  if (method === "paypal") return "PayPal 國際付款";
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

// ─── 聯絡表單通知信 ────────────────────────────────────────────────────────────

const subjectLabel: Record<string, string> = {
  product:   "產品詢問",
  order:     "訂單問題",
  wholesale: "批量採購",
  visit:     "茶園參訪",
  other:     "其他",
};

export async function sendContactEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const label = subjectLabel[data.subject] ?? escapeHtml(data.subject);
  const safeName    = escapeHtml(data.name);
  const safeEmail   = escapeHtml(data.email);
  const safeMessage = escapeHtml(data.message);
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:#7D9B84;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:2px;">📬 新聯絡訊息</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">霧抉茶後台</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px;">
          <h2 style="margin:0 0 20px;font-size:18px;color:#3D4A42;">您收到一則新訊息</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;width:80px;">姓名</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:600;">${safeName}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">Email</td>
              <td style="color:#3D4A42;font-size:13px;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">主旨</td>
              <td style="color:#3D4A42;font-size:13px;">${label}</td>
            </tr>
          </table>
          <h3 style="margin:0 0 10px;font-size:13px;color:#7D9B84;font-weight:700;letter-spacing:1px;">訊息內容</h3>
          <div style="background:#F5F0E8;border-radius:10px;padding:20px;font-size:14px;color:#3D4A42;line-height:1.8;white-space:pre-wrap;">${safeMessage}</div>
        </td></tr>

        <tr><td style="background:#F5F0E8;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA89E;">直接回覆此郵件即可回覆給 ${safeName}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from:     FROM,
    to:       ADMIN,
    replyTo:  data.email,
    subject:  `【聯絡我們】${label}｜${safeName}`,
    html,
  });
}

// ─── 出貨通知信 ───────────────────────────────────────────────────────────────

export async function sendShippingEmail(data: ShippingEmailData) {
  const safeCustomerName  = escapeHtml(data.customerName);
  const safeTrackingNote  = data.trackingNote ? escapeHtml(data.trackingNote) : undefined;
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
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${safeCustomerName}，您的訂單已完成出貨，請注意簽收。</p>

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
            ${safeTrackingNote ? `<tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">備註</td>
              <td style="color:#7D9B84;font-size:13px;font-weight:600;text-align:right;">${safeTrackingNote}</td>
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
  const safeNote = data.note ? escapeHtml(data.note) : undefined;
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

          ${safeNote ? `<div style="margin-top:24px;padding:14px;background:#F5F0E8;border-radius:8px;font-size:13px;color:#6B7B6E;">備註：${safeNote}</div>` : ""}

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
  const safeCustomerName  = escapeHtml(data.customerName);
  const safeCustomerEmail = escapeHtml(data.customerEmail);
  const safeNote          = data.note ? escapeHtml(data.note) : undefined;
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
              <td style="color:#3D4A42;font-size:13px;">${safeCustomerName}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">Email</td>
              <td style="color:#3D4A42;font-size:13px;">${safeCustomerEmail}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">付款</td>
              <td style="color:#3D4A42;font-size:13px;">${formatPayment(data.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:4px 0;">配送</td>
              <td style="color:#3D4A42;font-size:13px;">${formatShipping(data.shippingAddress)}</td>
            </tr>
            ${safeNote ? `<tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">備註</td><td style="color:#e07b39;font-size:13px;font-weight:600;">${safeNote}</td></tr>` : ""}
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

// ─── 體驗預約確認信 ────────────────────────────────────────────────────────────

export interface BookingEmailData {
  bookingId:        string;
  bookerName:       string;
  bookerEmail:      string;
  experienceName:   string;
  sessionDate:      string;   // "2026-05-10"
  startTime:        string;   // "10:00:00"
  participantCount: number;
  totalPrice:       number;
  participantsFillUrl: string; // 補填參加者資料連結
}

export async function sendBookingEmails(data: BookingEmailData) {
  await Promise.allSettled([
    sendBookingCustomerEmail(data),
    sendBookingAdminEmail(data),
  ]);
}

async function sendBookingCustomerEmail(data: BookingEmailData) {
  const safeName = escapeHtml(data.bookerName);
  const safeExp  = escapeHtml(data.experienceName);
  const shortBid = data.bookingId.replace(/-/g, "").slice(0, 10).toUpperCase();

  const dateLabel = new Date(`${data.sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeLabel = data.startTime.slice(0, 5);

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px;">
          <div style="display:inline-block;background:#EBF3EE;color:#5C7A67;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">預約確認</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">感謝您的預約！</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${safeName}，您的茶山體驗預約已確認，我們期待與您在茶園相見。</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">預約編號</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:700;text-align:right;font-family:monospace;">#${shortBid}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">活動日期</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">開始時間</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">參加人數</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${data.participantCount} 人</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">已付金額</td>
              <td style="color:#7D9B84;font-size:14px;font-weight:700;text-align:right;">NT$ ${data.totalPrice.toLocaleString()}</td>
            </tr>
          </table>

          <div style="background:#F0F6F1;border-radius:10px;border-left:3px solid #7D9B84;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#3D4A42;font-weight:700;">📋 請補填參加者資料</p>
            <p style="margin:0 0 14px;font-size:13px;color:#6B7B6E;line-height:1.6;">請於活動前 5 天內填寫所有參加者的身分證號、生日及緊急聯絡人資料。</p>
            <a href="${data.participantsFillUrl}" style="display:inline-block;background:#7D9B84;color:#ffffff;font-size:13px;font-weight:600;padding:10px 24px;border-radius:20px;text-decoration:none;">填寫參加者資料</a>
          </div>

          <div style="background:#FFF8ED;border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px;font-size:12px;color:#3D4A42;font-weight:700;">取消退款政策</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:12px;color:#6B7B6E;padding:2px 0;">活動前 7 天以上取消</td><td style="font-size:12px;color:#5C7A67;font-weight:600;text-align:right;">全額退款</td></tr>
              <tr><td style="font-size:12px;color:#6B7B6E;padding:2px 0;">活動前 3–6 天取消</td><td style="font-size:12px;color:#d97706;font-weight:600;text-align:right;">退款 50%</td></tr>
              <tr><td style="font-size:12px;color:#6B7B6E;padding:2px 0;">活動前 1–2 天取消</td><td style="font-size:12px;color:#d97706;font-weight:600;text-align:right;">退款 20%</td></tr>
              <tr><td style="font-size:12px;color:#6B7B6E;padding:2px 0;">24 小時內取消</td><td style="font-size:12px;color:#dc2626;font-weight:600;text-align:right;">不退款</td></tr>
            </table>
          </div>
        </td></tr>

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
    to:      data.bookerEmail,
    subject: `【霧抉茶】體驗預約確認 — ${safeExp} #${shortBid}`,
    html,
  });
}

// ─── 排程信型別 ───────────────────────────────────────────────────────────────

export interface ParticipantReminderData {
  bookingId:        string;
  bookerName:       string;
  bookerEmail:      string;
  experienceName:   string;
  sessionDate:      string;
  startTime:        string;
  participantCount: number;
  filledCount:      number;
  participantsFillUrl: string;
}

export interface SessionConfirmData {
  bookerName:       string;
  bookerEmail:      string;
  experienceName:   string;
  sessionDate:      string;
  startTime:        string;
  participantCount: number;
  totalPrice:       number;
}

export interface SessionCancelData {
  bookerName:       string;
  bookerEmail:      string;
  experienceName:   string;
  sessionDate:      string;
  startTime:        string;
  totalPrice:       number;
}

export interface DayBeforeReminderData {
  bookerName:       string;
  bookerEmail:      string;
  experienceName:   string;
  sessionDate:      string;
  startTime:        string;
  participantCount: number;
}

// ─── 5 天前：補填參加者資料提醒 ───────────────────────────────────────────────

export async function sendParticipantFillReminder(data: ParticipantReminderData) {
  const safeName = escapeHtml(data.bookerName);
  const safeExp  = escapeHtml(data.experienceName);
  const shortBid = data.bookingId.replace(/-/g, "").slice(0, 10).toUpperCase();

  const dateLabel = new Date(`${data.sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeLabel = data.startTime.slice(0, 5);
  const missing   = data.participantCount - data.filledCount;

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px;">
          <div style="display:inline-block;background:#FEF3C7;color:#92400E;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">⏰ 補填提醒</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">請盡快補填參加者資料</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${safeName}，距離您的茶山體驗還有 <strong style="color:#d97706;">5 天</strong>，目前仍有 <strong style="color:#dc2626;">${missing} 位</strong>參加者資料未填寫，請盡快完成。</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">預約編號</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:700;text-align:right;font-family:monospace;">#${shortBid}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">活動日期</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">開始時間</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">已填 / 總人數</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;"><strong style="color:${data.filledCount < data.participantCount ? "#dc2626" : "#5C7A67"};">${data.filledCount} / ${data.participantCount}</strong> 人</td>
            </tr>
          </table>

          <div style="background:#FEF9EC;border-radius:10px;border-left:3px solid #d97706;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="margin:0 0 14px;font-size:13px;color:#6B7B6E;line-height:1.6;">補填資料包含：姓名、身分證號、生日及緊急聯絡人。<br>活動當天須核對，請務必確認資料正確。</p>
            <a href="${data.participantsFillUrl}" style="display:inline-block;background:#7D9B84;color:#ffffff;font-size:14px;font-weight:700;padding:12px 32px;border-radius:24px;text-decoration:none;">立即補填參加者資料</a>
          </div>

          <p style="font-size:12px;color:#9CA89E;text-align:center;">如有任何問題，請來電 0972-619-391 或回覆此信</p>
        </td></tr>

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
    to:      data.bookerEmail,
    subject: `【霧抉茶】提醒：請補填 ${missing} 位參加者資料（活動前 5 天）— ${safeExp}`,
    html,
  });
}

// ─── 3 天前：開課確認通知 ──────────────────────────────────────────────────────

export async function sendSessionConfirmEmail(data: SessionConfirmData) {
  const safeName = escapeHtml(data.bookerName);
  const safeExp  = escapeHtml(data.experienceName);

  const dateLabel = new Date(`${data.sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeLabel = data.startTime.slice(0, 5);

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px;">
          <div style="display:inline-block;background:#EBF3EE;color:#5C7A67;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">✅ 活動確認開課</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">活動確認如期舉行！</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${safeName}，您參加的茶山體驗已確認開課，我們期待在茶園與您相見！</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">活動日期</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">開始時間</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">參加人數</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${data.participantCount} 人</td>
            </tr>
          </table>

          <div style="background:#F0F6F1;border-radius:10px;border-left:3px solid #7D9B84;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#3D4A42;font-weight:700;">📍 集合地點</p>
            <p style="margin:0 0 4px;font-size:13px;color:#6B7B6E;line-height:1.6;">嘉義縣梅山鄉太興村8鄰溪頭19號之2（霧抉茶茶園）</p>
            <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">請於活動開始前 15 分鐘到達，建議穿著舒適好走的鞋子。</p>
          </div>

          <p style="font-size:12px;color:#9CA89E;text-align:center;">如需取消或有任何問題，請來電 0972-619-391</p>
        </td></tr>

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
    to:      data.bookerEmail,
    subject: `【霧抉茶】活動確認 — ${safeExp} 將如期於 ${data.sessionDate} 舉行`,
    html,
  });
}

// ─── 客人自行取消預約通知 ──────────────────────────────────────────────────────

export interface BookingCancelData {
  bookerName:     string;
  bookerEmail:    string;
  experienceName: string;
  sessionDate:    string;
  startTime:      string;
  refundAmount:   number;
  wasPending:     boolean; // 取消時是否為待付款（未付款）
}

export async function sendBookingCancelEmail(data: BookingCancelData) {
  const safeName = escapeHtml(data.bookerName);
  const safeExp  = escapeHtml(data.experienceName);

  const dateLabel = new Date(`${data.sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeLabel = data.startTime.slice(0, 5);

  const refundBlock = data.wasPending
    ? `<div style="background:#F0F6F1;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">此預約尚未完成付款，取消後不會產生任何費用。</p>
      </div>`
    : data.refundAmount > 0
      ? `<div style="background:#FEF2F2;border-radius:10px;border-left:3px solid #ef4444;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;color:#3D4A42;font-weight:700;">💰 退款說明</p>
          <p style="margin:0 0 4px;font-size:13px;color:#6B7B6E;line-height:1.6;">退款金額：<strong>NT$ ${data.refundAmount.toLocaleString()}</strong></p>
          <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">退款將於 5–7 個工作天內退回您的原付款帳號。如有疑問請回覆此信或來電洽詢。</p>
        </div>`
      : `<div style="background:#FFF7ED;border-radius:10px;border-left:3px solid #f59e0b;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;color:#3D4A42;font-weight:700;">退款說明</p>
          <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">依本次取消時間距活動日不足 24 小時，依退款政策本次恕無退款。</p>
        </div>`;

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px;">
          <div style="display:inline-block;background:#FEE2E2;color:#991B1B;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">預約取消確認</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">您的預約已取消</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${safeName}，您的茶山體驗預約已成功取消，以下為取消明細。</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">原訂日期</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">原訂時間</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
          </table>

          ${refundBlock}

          <div style="background:#F0F6F1;border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px;font-size:13px;color:#3D4A42;font-weight:700;">期待下次相見</p>
            <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">歡迎隨時至官網查看最新場次，期待未來有機會在茶山與您相見。</p>
          </div>
        </td></tr>

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
    to:      data.bookerEmail,
    subject: `【霧抉茶】預約取消確認 — ${safeExp} ${data.sessionDate}`,
    html,
  });
}

// ─── 3 天前：取消通知 ──────────────────────────────────────────────────────────

export async function sendSessionCancelEmail(data: SessionCancelData) {
  const safeName = escapeHtml(data.bookerName);
  const safeExp  = escapeHtml(data.experienceName);

  const dateLabel = new Date(`${data.sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeLabel = data.startTime.slice(0, 5);

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px;">
          <div style="display:inline-block;background:#FEE2E2;color:#991B1B;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">⚠️ 活動取消通知</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">很遺憾，此場活動取消</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${safeName}，因報名人數未達開課最低門檻，本場茶山體驗活動將取消舉行，造成不便深感抱歉。</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">原訂日期</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">原訂時間</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
          </table>

          <div style="background:#FEF2F2;border-radius:10px;border-left:3px solid #ef4444;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#3D4A42;font-weight:700;">💰 退款說明</p>
            <p style="margin:0 0 4px;font-size:13px;color:#6B7B6E;line-height:1.6;">因活動取消，我們將於 5–7 個工作天內全額退款 <strong>NT$ ${data.totalPrice.toLocaleString()}</strong> 至您的原付款帳號。</p>
            <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">如有任何退款問題，請來電或回覆此信洽詢。</p>
          </div>

          <div style="background:#F0F6F1;border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px;font-size:13px;color:#3D4A42;font-weight:700;">下次再來！</p>
            <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">歡迎隨時至官網查看最新場次，期待未來有機會在茶園與您相見。</p>
          </div>
        </td></tr>

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
    to:      data.bookerEmail,
    subject: `【霧抉茶】活動取消通知 — ${safeExp} ${data.sessionDate} 已取消`,
    html,
  });
}

// ─── 1 天前：活動提醒 ──────────────────────────────────────────────────────────

export async function sendDayBeforeReminder(data: DayBeforeReminderData) {
  const safeName = escapeHtml(data.bookerName);
  const safeExp  = escapeHtml(data.experienceName);

  const dateLabel = new Date(`${data.sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeLabel = data.startTime.slice(0, 5);

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px;">
          <div style="display:inline-block;background:#EBF3EE;color:#5C7A67;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">🍵 明天見！</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">明天就是體驗日了！</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${safeName}，您的茶山體驗就在明天，請做好準備，我們期待與您在茶園相聚！</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:#3D4A42;font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">活動日期</td>
              <td style="color:#7D9B84;font-size:14px;font-weight:700;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">開始時間</td>
              <td style="color:#7D9B84;font-size:14px;font-weight:700;text-align:right;">${timeLabel}</td>
            </tr>
            <tr>
              <td style="color:#6B7B6E;font-size:13px;padding:5px 0;">參加人數</td>
              <td style="color:#3D4A42;font-size:13px;text-align:right;">${data.participantCount} 人</td>
            </tr>
          </table>

          <div style="background:#F0F6F1;border-radius:10px;border-left:3px solid #7D9B84;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#3D4A42;font-weight:700;">📍 集合地點</p>
            <p style="margin:0 0 12px;font-size:13px;color:#6B7B6E;line-height:1.6;">嘉義縣梅山鄉太興村8鄰溪頭19號之2（霧抉茶茶園）<br>請提前 15 分鐘抵達。</p>
            <p style="margin:0 0 8px;font-size:13px;color:#3D4A42;font-weight:700;">👟 建議準備</p>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:#6B7B6E;line-height:2;">
              <li>穿著舒適好走的運動鞋或登山鞋</li>
              <li>攜帶個人換洗衣物（茶園活動可能接觸土壤）</li>
              <li>自備飲水，防曬乳及帽子</li>
            </ul>
          </div>

          <p style="font-size:12px;color:#9CA89E;text-align:center;">如有任何問題，請來電 0972-619-391</p>
        </td></tr>

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
    to:      data.bookerEmail,
    subject: `【霧抉茶】明天見！${safeExp} 活動提醒 — ${data.sessionDate} ${timeLabel}`,
    html,
  });
}

// ─── 管理者取消場次通知 ────────────────────────────────────────────────────────

export async function sendAdminSessionCancelNotice(data: {
  experienceName: string;
  sessionDate: string;
  startTime: string;
  cancelledBookingCount: number;
  totalRefundAmount: number;
}) {
  const safeExp = escapeHtml(data.experienceName);
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr><td style="background:#dc2626;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:2px;">⚠️ 場次自動取消</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">霧抉茶後台</div>
        </td></tr>
        <tr><td style="background:#ffffff;padding:40px;">
          <h2 style="margin:0 0 16px;font-size:18px;color:#3D4A42;">場次未達開課人數，已自動取消</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;">
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">體驗</td><td style="color:#3D4A42;font-size:13px;font-weight:600;">${safeExp}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">日期</td><td style="color:#3D4A42;font-size:13px;">${data.sessionDate} ${data.startTime.slice(0, 5)}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">取消預約數</td><td style="color:#dc2626;font-size:13px;font-weight:700;">${data.cancelledBookingCount} 筆</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">需退款金額</td><td style="color:#dc2626;font-size:16px;font-weight:700;">NT$ ${data.totalRefundAmount.toLocaleString()}</td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#6B7B6E;">請至後台處理退款，並確認所有客戶已收到取消通知信。</p>
        </td></tr>
        <tr><td style="background:#F5F0E8;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA89E;">此為系統自動通知</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `【後台】場次取消 — ${safeExp} ${data.sessionDate} 共 ${data.cancelledBookingCount} 筆需退款`,
    html,
  });
}

// ─── 候補：有名額通知 ───────────────────────────────────────────────────────────

export async function sendWaitlistNotifyEmail(data: {
  waitlistId:     string;
  bookerName:     string;
  bookerEmail:    string;
  experienceName: string;
  sessionDate:    string;
  startTime:      string;
  confirmUrl:     string;
  deadlineLabel:  string;
}) {
  const safeName = escapeHtml(data.bookerName);
  const safeExp  = escapeHtml(data.experienceName);
  const dateLabel = new Date(`${data.sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeLabel = data.startTime.slice(0, 5);

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr><td style="background:#3D4A42;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#C8DDD0;letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:#7D9B84;letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>
        <tr><td style="background:#ffffff;padding:40px;">
          <div style="display:inline-block;background:#EBF3EE;color:#5C7A67;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">🎉 候補名額釋出</div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#3D4A42;">有名額了！請盡快確認</h2>
          <p style="margin:0 0 24px;color:#6B7B6E;font-size:14px;">親愛的 ${safeName}，您等候的場次有名額釋出，請於 <strong style="color:#dc2626;">${data.deadlineLabel}</strong> 前確認是否參加。</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr><td style="color:#6B7B6E;font-size:13px;padding:5px 0;">體驗項目</td><td style="color:#3D4A42;font-size:13px;font-weight:600;text-align:right;">${safeExp}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:5px 0;">活動日期</td><td style="color:#3D4A42;font-size:13px;text-align:right;">${dateLabel}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:5px 0;">開始時間</td><td style="color:#3D4A42;font-size:13px;text-align:right;">${timeLabel}</td></tr>
          </table>
          <div style="background:#FEF9EC;border-radius:10px;border-left:3px solid #d97706;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#6B7B6E;line-height:1.6;">超過截止時間未確認，名額將自動釋出給下一位候補者。</p>
          </div>
          <div style="text-align:center;">
            <a href="${data.confirmUrl}" style="display:inline-block;background:#7D9B84;color:#ffffff;font-size:15px;font-weight:700;padding:14px 40px;border-radius:28px;text-decoration:none;">確認參加並付款</a>
          </div>
          <p style="font-size:12px;color:#9CA89E;text-align:center;margin-top:20px;">如不打算參加，無須任何操作，名額將自動釋出。</p>
        </td></tr>
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
    to:      data.bookerEmail,
    subject: `【霧抉茶】候補通知！${safeExp} ${data.sessionDate} 有名額釋出，請在 ${data.deadlineLabel} 前確認`,
    html,
  });
}

async function sendBookingAdminEmail(data: BookingEmailData) {
  const safeName = escapeHtml(data.bookerName);
  const safeExp  = escapeHtml(data.experienceName);
  const shortBid = data.bookingId.replace(/-/g, "").slice(0, 10).toUpperCase();

  const dateLabel = new Date(`${data.sessionDate}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:#7D9B84;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:2px;">🍃 新體驗預約</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:4px;">霧抉茶後台</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px;">
          <h2 style="margin:0 0 20px;font-size:18px;color:#3D4A42;">有新的體驗預約進來了！</h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;width:90px;">預約編號</td><td style="color:#3D4A42;font-size:13px;font-weight:700;font-family:monospace;">#${shortBid}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">訂購人</td><td style="color:#3D4A42;font-size:13px;">${safeName}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">Email</td><td style="color:#3D4A42;font-size:13px;">${escapeHtml(data.bookerEmail)}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">體驗</td><td style="color:#3D4A42;font-size:13px;font-weight:600;">${safeExp}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">日期</td><td style="color:#3D4A42;font-size:13px;">${dateLabel} ${data.startTime.slice(0, 5)}</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">人數</td><td style="color:#3D4A42;font-size:13px;">${data.participantCount} 人</td></tr>
            <tr><td style="color:#6B7B6E;font-size:13px;padding:4px 0;">金額</td><td style="color:#7D9B84;font-size:16px;font-weight:700;">NT$ ${data.totalPrice.toLocaleString()}</td></tr>
          </table>
        </td></tr>

        <tr><td style="background:#F5F0E8;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA89E;">請至後台查看完整預約詳情</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `【新預約】${safeName} — ${safeExp} ${data.sessionDate} ${data.startTime.slice(0, 5)}｜${data.participantCount}人`,
    html,
  });
}
