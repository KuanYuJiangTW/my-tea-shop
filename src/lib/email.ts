import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM    = process.env.RESEND_FROM_EMAIL ?? "霧抉茶 <noreply@taiwantea.store>";
const ADMIN   = process.env.ADMIN_EMAIL       ?? "qdbzdt2846@gmail.com";

/**
 * Email 色盤——本檔色值的單一事實來源。
 *
 * 為什麼是常數而不是 Tailwind class：多數收件軟體不載入外部 CSS，
 * email 的樣式必須內聯，所以前台那套語意 token 在這裡用不上。
 * 改色請只動這個物件，不要再全檔搜尋 hex（歷史上就是那樣漂移的：
 * 同一個色出現過大小寫兩種寫法、`#E8E0D2` 與 `#E8E0D4` 只差最後一碼）。
 *
 * 品牌色與 `docs/design-system.md` 的 `tea-*` 對齊，數值相同。
 */
const C = {
  // ── 品牌色（對齊 design-system 的 tea-*）
  text:      "#3D4A42",  // tea-text         主文字、深色區塊底
  muted:     "#637169",  // tea-text-muted   次要內文，白/米/綠霧底皆達 AA
  faint:     "#9CA89E",  // tea-text-faint   第三層文字
  cream:     "#F5F0E8",  // tea-cream        米底
  creamDark: "#EDE8DC",  // tea-cream-dark   分隔線、深色頁首上的品牌名
  green:     "#7D9B84",  // tea-green        品牌綠、按鈕底
  greenDark: "#5C7A67",  // tea-green-dark
  greenPale: "#C8DDD0",  // tea-green-pale   邊框
  greenMist: "#EBF3EE",  // tea-green-mist   最淺綠底
  white:     "#FFFFFF",

  // ── 狀態色：**刻意維持高彩度，不收進前台的 status-***
  //    2026-08-08 小江拍板：信件警示要夠強烈（見 WORKLOG 第十三波）。
  //    日後掃硬編碼色值時不要把這一組「順手收掉」。
  danger:      "#DC2626",
  dangerDeep:  "#991B1B",
  dangerLight: "#EF4444",
  dangerSoft:  "#FEE2E2",
  dangerBg:    "#FEF2F2",
  warn:        "#D97706",
  warnDeep:    "#92400E",
  warnGold:    "#B8860B",
  warnAmber:   "#F59E0B",
  warnOrange:  "#E07B39",
  warnSoft:    "#FEF3C7",
  warnBg:      "#FEF9EC",
  warnBgWarm:  "#FFF7ED",
  warnBgPale:  "#FFF8ED",

  // ── 中性灰：只用在管理員通知信的表格，不對客人露出
  gray:     "#DDDDDD",
  grayBg:   "#F5F5F5",
  grayText: "#999999",

  // ── 尚未歸類：色盤外的深灰綠，3 處。收斂時從這裡下手
  sage: "#5A6B5E",
} as const;

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
    type:       "home" | "cvs" | "international";
    city?:      string;
    address?:   string;
    company?:   string;
    storeName?: string;
    country?:      string;
    countryName?:  string;
    state?:        string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?:   string;
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
  if (addr.type === "international") {
    const parts = [
      addr.addressLine1,
      addr.addressLine2,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.countryName ?? addr.country,
    ].filter(Boolean).map(s => escapeHtml(s!));
    return `國際配送｜${parts.join(", ")}`;
  }
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
      <td style="padding:10px 0;border-bottom:1px solid ${C.creamDark};color:${C.text};">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${C.creamDark};color:${C.text};text-align:center;">${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${C.creamDark};color:${C.text};text-align:right;">NT$${i.unitPrice.toLocaleString()}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${C.creamDark};color:${C.text};text-align:right;font-weight:600;">NT$${i.subtotal.toLocaleString()}</td>
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.green};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:${C.white};letter-spacing:2px;">📬 新聯絡訊息</div>
          <div style="font-size:22px;font-weight:700;color:${C.white};margin-top:4px;">霧抉茶後台</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <h2 style="margin:0 0 20px;font-size:18px;color:${C.text};">您收到一則新訊息</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;width:80px;">姓名</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;">${safeName}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">Email</td>
              <td style="color:${C.text};font-size:13px;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">主旨</td>
              <td style="color:${C.text};font-size:13px;">${label}</td>
            </tr>
          </table>
          <h3 style="margin:0 0 10px;font-size:13px;color:${C.green};font-weight:700;letter-spacing:1px;">訊息內容</h3>
          <div style="background:${C.cream};border-radius:10px;padding:20px;font-size:14px;color:${C.text};line-height:1.8;white-space:pre-wrap;">${safeMessage}</div>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${C.faint};">直接回覆此郵件即可回覆給 ${safeName}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from:     FROM,
    to:       ADMIN,
    replyTo:  data.email,
    subject:  `【聯絡我們】${label}｜${safeName}`,
    html,
  });
}

// ─── 風土數位報價頁：諮詢表單通知信 ──────────────────────────────────────────

const referralSourceLabel: Record<string, string> = {
  site:     "逛霧抉茶看到的",
  referral: "朋友介紹",
  search:   "搜尋找到",
  social:   "社群看到",
  other:    "其他",
};

const painPointLabel: Record<string, string> = {
  noWebsite:    "還沒有網站",
  oldWebsite:   "網站太舊想重做",
  onlineOrders: "想開始收線上訂單",
  booking:      "想要線上預約功能",
  seo:          "想被 Google 和 AI 搜到",
  other:        "其他",
};

const budgetRangeLabel: Record<string, string> = {
  under50k:   "5 萬內",
  "50to150k": "5–15 萬",
  "150to300k": "15–30 萬",
  over300k:   "30 萬以上",
  undecided:  "還不確定",
};

const timelineLabel: Record<string, string> = {
  within1m:   "1 個月內",
  within3m:   "3 個月內",
  evaluating: "還在評估",
};

export interface WebInquiryEmailData {
  referralSource: string;
  industryBrand:  string;
  painPoints:     string[];
  budgetRange:    string;
  timeline:       string;
  contactName:    string;
  contactLine?:   string;
  contactEmail?:  string;
  contactTime?:   string;
  locale:         string;
}

export async function sendWebInquiryEmail(data: WebInquiryEmailData) {
  const safeName         = escapeHtml(data.contactName);
  const safeIndustry     = escapeHtml(data.industryBrand);
  const safeLine         = data.contactLine  ? escapeHtml(data.contactLine)  : undefined;
  const safeEmail        = data.contactEmail ? escapeHtml(data.contactEmail) : undefined;
  const safeContactTime  = data.contactTime  ? escapeHtml(data.contactTime)  : undefined;
  const referralLabel    = referralSourceLabel[data.referralSource] ?? escapeHtml(data.referralSource);
  const budgetLabel      = budgetRangeLabel[data.budgetRange] ?? escapeHtml(data.budgetRange);
  const timelineLabelStr = timelineLabel[data.timeline] ?? escapeHtml(data.timeline);
  const painPointsLabel  = data.painPoints.length > 0
    ? data.painPoints.map(p => painPointLabel[p] ?? escapeHtml(p)).join("、")
    : "（未填）";

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.green};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:${C.white};letter-spacing:2px;">🌱 風土數位新諮詢</div>
          <div style="font-size:22px;font-weight:700;color:${C.white};margin-top:4px;">/web-design 報價頁</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <h2 style="margin:0 0 20px;font-size:18px;color:${C.text};">有新的接案諮詢</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;width:100px;">認識管道</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;">${referralLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">產業／品牌</td>
              <td style="color:${C.text};font-size:13px;">${safeIndustry}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">預算區間</td>
              <td style="color:${C.text};font-size:13px;">${budgetLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">上線時程</td>
              <td style="color:${C.text};font-size:13px;">${timelineLabelStr}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">姓名</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;">${safeName}</td>
            </tr>
            ${safeLine ? `<tr><td style="color:${C.muted};font-size:13px;padding:5px 0;">LINE</td><td style="color:${C.text};font-size:13px;">${safeLine}</td></tr>` : ""}
            ${safeEmail ? `<tr><td style="color:${C.muted};font-size:13px;padding:5px 0;">Email</td><td style="color:${C.text};font-size:13px;">${safeEmail}</td></tr>` : ""}
            ${safeContactTime ? `<tr><td style="color:${C.muted};font-size:13px;padding:5px 0;">方便時段</td><td style="color:${C.text};font-size:13px;">${safeContactTime}</td></tr>` : ""}
          </table>
          <h3 style="margin:0 0 10px;font-size:13px;color:${C.green};font-weight:700;letter-spacing:1px;">想解決的痛點</h3>
          <div style="background:${C.cream};border-radius:10px;padding:20px;font-size:14px;color:${C.text};line-height:1.8;">${painPointsLabel}</div>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${C.faint};">請至 Supabase 後台 web_inquiries 資料表查看完整紀錄</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `【風土數位】新諮詢｜${safeName}（${safeIndustry}）`,
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:${C.white};padding:40px;">

          <div style="display:inline-block;background:${C.greenMist};color:${C.greenDark};font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">已出貨</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">您的茶葉已出發囉！</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">親愛的 ${safeCustomerName}，您的訂單已完成出貨，請注意簽收。</p>

          <!-- 訂單資訊 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">訂單編號</td>
              <td style="color:${C.text};font-size:13px;font-weight:700;text-align:right;font-family:monospace;">#${shortId(data.orderId)}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">配送方式</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${formatShipping(data.shippingAddress)}</td>
            </tr>
            ${safeTrackingNote ? `<tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">備註</td>
              <td style="color:${C.green};font-size:13px;font-weight:600;text-align:right;">${safeTrackingNote}</td>
            </tr>` : ""}
          </table>

          <!-- 品項明細 -->
          <h3 style="margin:0 0 12px;font-size:14px;color:${C.text};font-weight:700;">購買品項</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr style="border-bottom:2px solid ${C.creamDark};">
              <th style="padding:8px 0;text-align:left;color:${C.muted};font-size:12px;font-weight:600;">品項</th>
              <th style="padding:8px 0;text-align:center;color:${C.muted};font-size:12px;font-weight:600;">數量</th>
              <th style="padding:8px 0;text-align:right;color:${C.muted};font-size:12px;font-weight:600;">小計</th>
            </tr>
            ${data.items.map(i => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid ${C.creamDark};color:${C.text};">${i.name}</td>
              <td style="padding:10px 0;border-bottom:1px solid ${C.creamDark};color:${C.text};text-align:center;">${i.quantity}</td>
              <td style="padding:10px 0;border-bottom:1px solid ${C.creamDark};color:${C.text};text-align:right;font-weight:600;">NT$${i.subtotal.toLocaleString()}</td>
            </tr>`).join("")}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr style="border-top:2px solid ${C.text};">
              <td style="color:${C.text};font-size:16px;font-weight:700;padding:12px 0 0;">總金額</td>
              <td style="color:${C.green};font-size:18px;font-weight:700;text-align:right;padding-top:12px;">NT$${data.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

          <div style="margin-top:32px;padding:20px;background:${C.greenMist};border-radius:10px;border-left:3px solid ${C.green};">
            <p style="margin:0 0 6px;font-size:13px;color:${C.text};font-weight:600;">收貨注意事項</p>
            <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">宅配預計 1–3 個工作天送達；超商到店後請於 3 天內取件。如有任何問題，歡迎來電或傳訊息給我們。</p>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:${C.white};padding:40px;">

          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">感謝您的訂購！</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">您的訂單已成立，我們將盡快為您備貨。</p>

          <!-- 訂單資訊 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">訂單編號</td>
              <td style="color:${C.text};font-size:13px;font-weight:700;text-align:right;font-family:monospace;">#${shortId(data.orderId)}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">付款方式</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${formatPayment(data.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">配送方式</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${formatShipping(data.shippingAddress)}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">預計出貨</td>
              <td style="color:${C.green};font-size:13px;font-weight:600;text-align:right;">3–5 個工作天</td>
            </tr>
          </table>

          <!-- 品項明細 -->
          <h3 style="margin:0 0 12px;font-size:14px;color:${C.text};font-weight:700;">購買品項</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr style="border-bottom:2px solid ${C.creamDark};">
              <th style="padding:8px 0;text-align:left;color:${C.muted};font-size:12px;font-weight:600;">品項</th>
              <th style="padding:8px 0;text-align:center;color:${C.muted};font-size:12px;font-weight:600;">數量</th>
              <th style="padding:8px 0;text-align:right;color:${C.muted};font-size:12px;font-weight:600;">單價</th>
              <th style="padding:8px 0;text-align:right;color:${C.muted};font-size:12px;font-weight:600;">小計</th>
            </tr>
            ${itemRows(data.items)}
          </table>

          <!-- 金額合計 -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:4px 0;">商品金額</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">NT$${(data.totalAmount - data.shippingFee).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:4px 0;">運費</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${data.shippingFee === 0 ? "免費" : `NT$${data.shippingFee.toLocaleString()}`}</td>
            </tr>
            <tr style="border-top:2px solid ${C.text};margin-top:8px;">
              <td style="color:${C.text};font-size:16px;font-weight:700;padding:12px 0 0;">總金額</td>
              <td style="color:${C.green};font-size:18px;font-weight:700;text-align:right;padding-top:12px;">NT$${data.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

          ${safeNote ? `<div style="margin-top:24px;padding:14px;background:${C.cream};border-radius:8px;font-size:13px;color:${C.muted};">備註：${safeNote}</div>` : ""}

          <!-- 說明 -->
          <div style="margin-top:32px;padding:20px;background:${C.greenMist};border-radius:10px;border-left:3px solid ${C.green};">
            <p style="margin:0 0 6px;font-size:13px;color:${C.text};font-weight:600;">出貨通知</p>
            <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">商品出貨後，我們會以簡訊或電話通知您取貨資訊。如有任何問題，歡迎來電或傳訊息給我們。</p>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:${C.green};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:${C.white};letter-spacing:2px;">🍃 新訂單通知</div>
          <div style="font-size:22px;font-weight:700;color:${C.white};margin-top:4px;">霧抉茶後台</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:${C.white};padding:40px;">

          <h2 style="margin:0 0 20px;font-size:18px;color:${C.text};">有新訂單進來了！</h2>

          <!-- 顧客資訊 -->
          <h3 style="margin:0 0 10px;font-size:13px;color:${C.green};font-weight:700;text-transform:uppercase;letter-spacing:1px;">顧客資訊</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:4px 0;width:90px;">訂單編號</td>
              <td style="color:${C.text};font-size:13px;font-weight:700;font-family:monospace;">#${shortId(data.orderId)}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:4px 0;">姓名</td>
              <td style="color:${C.text};font-size:13px;">${safeCustomerName}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:4px 0;">Email</td>
              <td style="color:${C.text};font-size:13px;">${safeCustomerEmail}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:4px 0;">付款</td>
              <td style="color:${C.text};font-size:13px;">${formatPayment(data.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:4px 0;">配送</td>
              <td style="color:${C.text};font-size:13px;">${formatShipping(data.shippingAddress)}</td>
            </tr>
            ${safeNote ? `<tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">備註</td><td style="color:${C.warnOrange};font-size:13px;font-weight:600;">${safeNote}</td></tr>` : ""}
          </table>

          <!-- 品項 -->
          <h3 style="margin:0 0 10px;font-size:13px;color:${C.green};font-weight:700;text-transform:uppercase;letter-spacing:1px;">購買品項</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr style="border-bottom:2px solid ${C.creamDark};">
              <th style="padding:8px 0;text-align:left;color:${C.muted};font-size:12px;">品項</th>
              <th style="padding:8px 0;text-align:center;color:${C.muted};font-size:12px;">數量</th>
              <th style="padding:8px 0;text-align:right;color:${C.muted};font-size:12px;">單價</th>
              <th style="padding:8px 0;text-align:right;color:${C.muted};font-size:12px;">小計</th>
            </tr>
            ${itemRows(data.items)}
          </table>

          <!-- 金額 -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:3px 0;">運費</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${data.shippingFee === 0 ? "免費" : `NT$${data.shippingFee.toLocaleString()}`}</td>
            </tr>
            <tr>
              <td style="color:${C.text};font-size:16px;font-weight:700;padding:10px 0 0;">應收總金額</td>
              <td style="color:${C.green};font-size:20px;font-weight:700;text-align:right;padding-top:10px;">NT$${data.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${C.faint};">請至 Supabase 後台查看完整訂單詳情</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <div style="display:inline-block;background:${C.greenMist};color:${C.greenDark};font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">預約確認</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">感謝您的預約！</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">親愛的 ${safeName}，您的茶山體驗預約已確認，我們期待與您在茶園相見。</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">預約編號</td>
              <td style="color:${C.text};font-size:13px;font-weight:700;text-align:right;font-family:monospace;">#${shortBid}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">活動日期</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">開始時間</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">參加人數</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${data.participantCount} 人</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">已付金額</td>
              <td style="color:${C.green};font-size:14px;font-weight:700;text-align:right;">NT$ ${data.totalPrice.toLocaleString()}</td>
            </tr>
          </table>

          <div style="background:${C.greenMist};border-radius:10px;border-left:3px solid ${C.green};padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:${C.text};font-weight:700;">📋 請補填參加者資料</p>
            <p style="margin:0 0 14px;font-size:13px;color:${C.muted};line-height:1.6;">請於活動前 5 天內填寫所有參加者的身分證號、生日及緊急聯絡人資料。</p>
            <a href="${data.participantsFillUrl}" style="display:inline-block;background:${C.green};color:${C.white};font-size:13px;font-weight:600;padding:10px 24px;border-radius:20px;text-decoration:none;">填寫參加者資料</a>
          </div>

          <div style="background:${C.warnBgPale};border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px;font-size:12px;color:${C.text};font-weight:700;">取消退款政策</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:12px;color:${C.muted};padding:2px 0;">活動前 7 天以上取消</td><td style="font-size:12px;color:${C.greenDark};font-weight:600;text-align:right;">全額退款</td></tr>
              <tr><td style="font-size:12px;color:${C.muted};padding:2px 0;">活動前 3–6 天取消</td><td style="font-size:12px;color:${C.warn};font-weight:600;text-align:right;">退款 50%</td></tr>
              <tr><td style="font-size:12px;color:${C.muted};padding:2px 0;">活動前 1–2 天取消</td><td style="font-size:12px;color:${C.warn};font-weight:600;text-align:right;">退款 20%</td></tr>
              <tr><td style="font-size:12px;color:${C.muted};padding:2px 0;">24 小時內取消</td><td style="font-size:12px;color:${C.danger};font-weight:600;text-align:right;">不退款</td></tr>
            </table>
          </div>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <div style="display:inline-block;background:${C.warnSoft};color:${C.warnDeep};font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">⏰ 補填提醒</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">請盡快補填參加者資料</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">親愛的 ${safeName}，距離您的茶山體驗還有 <strong style="color:${C.warn};">5 天</strong>，目前仍有 <strong style="color:${C.danger};">${missing} 位</strong>參加者資料未填寫，請盡快完成。</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">預約編號</td>
              <td style="color:${C.text};font-size:13px;font-weight:700;text-align:right;font-family:monospace;">#${shortBid}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">活動日期</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">開始時間</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">已填 / 總人數</td>
              <td style="color:${C.text};font-size:13px;text-align:right;"><strong style="color:${data.filledCount < data.participantCount ? C.danger : C.greenDark};">${data.filledCount} / ${data.participantCount}</strong> 人</td>
            </tr>
          </table>

          <div style="background:${C.warnBg};border-radius:10px;border-left:3px solid ${C.warn};padding:20px;margin-bottom:24px;text-align:center;">
            <p style="margin:0 0 14px;font-size:13px;color:${C.muted};line-height:1.6;">補填資料包含：姓名、身分證號、生日及緊急聯絡人。<br>活動當天須核對，請務必確認資料正確。</p>
            <a href="${data.participantsFillUrl}" style="display:inline-block;background:${C.green};color:${C.white};font-size:14px;font-weight:700;padding:12px 32px;border-radius:24px;text-decoration:none;">立即補填參加者資料</a>
          </div>

          <p style="font-size:12px;color:${C.faint};text-align:center;">如有任何問題，請來電 0972-619-391 或回覆此信</p>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <div style="display:inline-block;background:${C.greenMist};color:${C.greenDark};font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">✅ 活動確認開課</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">活動確認如期舉行！</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">親愛的 ${safeName}，您參加的茶山體驗已確認開課，我們期待在茶園與您相見！</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">活動日期</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">開始時間</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">參加人數</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${data.participantCount} 人</td>
            </tr>
          </table>

          <div style="background:${C.greenMist};border-radius:10px;border-left:3px solid ${C.green};padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:${C.text};font-weight:700;">📍 集合地點</p>
            <p style="margin:0 0 4px;font-size:13px;color:${C.muted};line-height:1.6;">嘉義縣梅山鄉太興村8鄰溪頭19號之2（霧抉茶茶園）</p>
            <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">請於活動開始前 15 分鐘到達，建議穿著舒適好走的鞋子。</p>
          </div>

          <p style="font-size:12px;color:${C.faint};text-align:center;">如需取消或有任何問題，請來電 0972-619-391</p>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
    ? `<div style="background:${C.greenMist};border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">此預約尚未完成付款，取消後不會產生任何費用。</p>
      </div>`
    : data.refundAmount > 0
      ? `<div style="background:${C.dangerBg};border-radius:10px;border-left:3px solid ${C.dangerLight};padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;color:${C.text};font-weight:700;">💰 退款說明</p>
          <p style="margin:0 0 4px;font-size:13px;color:${C.muted};line-height:1.6;">退款金額：<strong>NT$ ${data.refundAmount.toLocaleString()}</strong></p>
          <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">退款將於 5–7 個工作天內退回您的原付款帳號。如有疑問請回覆此信或來電洽詢。</p>
        </div>`
      : `<div style="background:${C.warnBgWarm};border-radius:10px;border-left:3px solid ${C.warnAmber};padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;color:${C.text};font-weight:700;">退款說明</p>
          <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">依本次取消時間距活動日不足 24 小時，依退款政策本次恕無退款。</p>
        </div>`;

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <div style="display:inline-block;background:${C.dangerSoft};color:${C.dangerDeep};font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">預約取消確認</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">您的預約已取消</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">親愛的 ${safeName}，您的茶山體驗預約已成功取消，以下為取消明細。</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">原訂日期</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">原訂時間</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
          </table>

          ${refundBlock}

          <div style="background:${C.greenMist};border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px;font-size:13px;color:${C.text};font-weight:700;">期待下次相見</p>
            <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">歡迎隨時至官網查看最新場次，期待未來有機會在茶山與您相見。</p>
          </div>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <div style="display:inline-block;background:${C.dangerSoft};color:${C.dangerDeep};font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">⚠️ 活動取消通知</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">很遺憾，此場活動取消</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">親愛的 ${safeName}，因報名人數未達開課最低門檻，本場茶山體驗活動將取消舉行，造成不便深感抱歉。</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">原訂日期</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">原訂時間</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${timeLabel}</td>
            </tr>
          </table>

          <div style="background:${C.dangerBg};border-radius:10px;border-left:3px solid ${C.dangerLight};padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:${C.text};font-weight:700;">💰 退款說明</p>
            <p style="margin:0 0 4px;font-size:13px;color:${C.muted};line-height:1.6;">因活動取消，我們將於 5–7 個工作天內全額退款 <strong>NT$ ${data.totalPrice.toLocaleString()}</strong> 至您的原付款帳號。</p>
            <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">如有任何退款問題，請來電或回覆此信洽詢。</p>
          </div>

          <div style="background:${C.greenMist};border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px;font-size:13px;color:${C.text};font-weight:700;">下次再來！</p>
            <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">歡迎隨時至官網查看最新場次，期待未來有機會在茶園與您相見。</p>
          </div>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <div style="display:inline-block;background:${C.greenMist};color:${C.greenDark};font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">🍵 明天見！</div>

          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">明天就是體驗日了！</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">親愛的 ${safeName}，您的茶山體驗就在明天，請做好準備，我們期待與您在茶園相聚！</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">體驗項目</td>
              <td style="color:${C.text};font-size:13px;font-weight:600;text-align:right;">${safeExp}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">活動日期</td>
              <td style="color:${C.green};font-size:14px;font-weight:700;text-align:right;">${dateLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">開始時間</td>
              <td style="color:${C.green};font-size:14px;font-weight:700;text-align:right;">${timeLabel}</td>
            </tr>
            <tr>
              <td style="color:${C.muted};font-size:13px;padding:5px 0;">參加人數</td>
              <td style="color:${C.text};font-size:13px;text-align:right;">${data.participantCount} 人</td>
            </tr>
          </table>

          <div style="background:${C.greenMist};border-radius:10px;border-left:3px solid ${C.green};padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:${C.text};font-weight:700;">📍 集合地點</p>
            <p style="margin:0 0 12px;font-size:13px;color:${C.muted};line-height:1.6;">嘉義縣梅山鄉太興村8鄰溪頭19號之2（霧抉茶茶園）<br>請提前 15 分鐘抵達。</p>
            <p style="margin:0 0 8px;font-size:13px;color:${C.text};font-weight:700;">👟 建議準備</p>
            <ul style="margin:0;padding-left:18px;font-size:13px;color:${C.muted};line-height:2;">
              <li>穿著舒適好走的運動鞋或登山鞋</li>
              <li>攜帶個人換洗衣物（茶園活動可能接觸土壤）</li>
              <li>自備飲水，防曬乳及帽子</li>
            </ul>
          </div>

          <p style="font-size:12px;color:${C.faint};text-align:center;">如有任何問題，請來電 0972-619-391</p>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr><td style="background:${C.danger};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:${C.white};letter-spacing:2px;">⚠️ 場次自動取消</div>
          <div style="font-size:22px;font-weight:700;color:${C.white};margin-top:4px;">霧抉茶後台</div>
        </td></tr>
        <tr><td style="background:${C.white};padding:40px;">
          <h2 style="margin:0 0 16px;font-size:18px;color:${C.text};">場次未達開課人數，已自動取消</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;">
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">體驗</td><td style="color:${C.text};font-size:13px;font-weight:600;">${safeExp}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">日期</td><td style="color:${C.text};font-size:13px;">${data.sessionDate} ${data.startTime.slice(0, 5)}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">取消預約數</td><td style="color:${C.danger};font-size:13px;font-weight:700;">${data.cancelledBookingCount} 筆</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">需退款金額</td><td style="color:${C.danger};font-size:16px;font-weight:700;">NT$ ${data.totalRefundAmount.toLocaleString()}</td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">請至後台處理退款，並確認所有客戶已收到取消通知信。</p>
        </td></tr>
        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${C.faint};">此為系統自動通知</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `【後台】場次取消 — ${safeExp} ${data.sessionDate} 共 ${data.cancelledBookingCount} 筆需退款`,
    html,
  });
}

// ─── 管理者待退款對帳提醒 ──────────────────────────────────────────────────────

// 現金退款目前是純人工（要去綠界後台操作，再回本站後台標記 processed）。
// 沒有任何機制會提醒「這筆躺很久了」，這封信就是那個機制。
export async function sendAdminPendingRefundDigest(data: {
  items: {
    bookingId:      string;
    bookerName:     string;
    experienceName: string;
    cancelledAt:    string;
    refundAmount:   number | null; // null = 全額退（場次取消那條路徑會寫 null）
    totalPrice:     number;
    daysPending:    number;
  }[];
}) {
  if (data.items.length === 0) return;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://taiwantea.store";
  const total = data.items.reduce((s, i) => s + (i.refundAmount ?? i.totalPrice), 0);
  const oldest = Math.max(...data.items.map(i => i.daysPending));

  const rows = data.items.map(i => {
    const amount = i.refundAmount ?? i.totalPrice;
    const amountLabel = i.refundAmount === null
      ? `NT$ ${i.totalPrice.toLocaleString()}（全額）`
      : `NT$ ${amount.toLocaleString()}`;
    return `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid ${C.creamDark};font-size:12px;color:${C.text};">${escapeHtml(i.bookerName)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid ${C.creamDark};font-size:12px;color:${C.muted};">${escapeHtml(i.experienceName)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid ${C.creamDark};font-size:12px;color:${C.muted};">${i.cancelledAt.slice(0, 10)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid ${C.creamDark};font-size:12px;color:${C.danger};font-weight:700;">${i.daysPending} 天</td>
      <td style="padding:8px 6px;border-bottom:1px solid ${C.creamDark};font-size:12px;color:${C.text};font-weight:600;">${amountLabel}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;">
        <tr><td style="background:${C.warnGold};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:${C.white};letter-spacing:2px;">💰 待退款提醒</div>
          <div style="font-size:22px;font-weight:700;color:${C.white};margin-top:4px;">霧抉茶後台</div>
        </td></tr>
        <tr><td style="background:${C.white};padding:40px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:${C.text};">有 ${data.items.length} 筆退款尚未處理</h2>
          <p style="margin:0 0 20px;font-size:13px;color:${C.muted};">最久的已經等了 ${oldest} 天，合計 NT$ ${total.toLocaleString()}。</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:${C.cream};">
              <th align="left" style="padding:8px 6px;font-size:12px;color:${C.muted};">訂購人</th>
              <th align="left" style="padding:8px 6px;font-size:12px;color:${C.muted};">體驗</th>
              <th align="left" style="padding:8px 6px;font-size:12px;color:${C.muted};">取消日</th>
              <th align="left" style="padding:8px 6px;font-size:12px;color:${C.muted};">已等待</th>
              <th align="left" style="padding:8px 6px;font-size:12px;color:${C.muted};">退款金額</th>
            </tr>
            ${rows}
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:${C.muted};">
            退款要在綠界後台操作，完成後回
            <a href="${base}/admin/experiences/bookings" style="color:${C.warnGold};">本站後台</a>
            把該筆標記為「已退款」，這封信才不會再提醒。
          </p>
          <p style="margin:12px 0 0;font-size:12px;color:${C.faint};">
            折抵的點數已由系統自動退回會員帳戶，不需人工處理。
          </p>
        </td></tr>
        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${C.faint};">此為系統自動通知</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `【後台】${data.items.length} 筆退款待處理，最久 ${oldest} 天 — 合計 NT$ ${total.toLocaleString()}`,
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr><td style="background:${C.text};border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${C.greenPale};letter-spacing:4px;margin-bottom:4px;">霧抉茶</div>
          <div style="font-size:11px;color:${C.green};letter-spacing:3px;text-transform:uppercase;">Wu Jue Tea</div>
        </td></tr>
        <tr><td style="background:${C.white};padding:40px;">
          <div style="display:inline-block;background:${C.greenMist};color:${C.greenDark};font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:20px;margin-bottom:20px;">🎉 候補名額釋出</div>
          <h2 style="margin:0 0 8px;font-size:22px;color:${C.text};">有名額了！請盡快確認</h2>
          <p style="margin:0 0 24px;color:${C.muted};font-size:14px;">親愛的 ${safeName}，您等候的場次有名額釋出，請於 <strong style="color:${C.danger};">${data.deadlineLabel}</strong> 前確認是否參加。</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:28px;">
            <tr><td style="color:${C.muted};font-size:13px;padding:5px 0;">體驗項目</td><td style="color:${C.text};font-size:13px;font-weight:600;text-align:right;">${safeExp}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:5px 0;">活動日期</td><td style="color:${C.text};font-size:13px;text-align:right;">${dateLabel}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:5px 0;">開始時間</td><td style="color:${C.text};font-size:13px;text-align:right;">${timeLabel}</td></tr>
          </table>
          <div style="background:${C.warnBg};border-radius:10px;border-left:3px solid ${C.warn};padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.6;">超過截止時間未確認，名額將自動釋出給下一位候補者。</p>
          </div>
          <div style="text-align:center;">
            <a href="${data.confirmUrl}" style="display:inline-block;background:${C.green};color:${C.white};font-size:15px;font-weight:700;padding:14px 40px;border-radius:28px;text-decoration:none;">確認參加並付款</a>
          </div>
          <p style="font-size:12px;color:${C.faint};text-align:center;margin-top:20px;">如不打算參加，無須任何操作，名額將自動釋出。</p>
        </td></tr>
        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${C.green};font-weight:600;">霧抉茶</p>
          <p style="margin:0 0 4px;font-size:12px;color:${C.faint};">嘉義縣梅山鄉太興村8鄰溪頭19號之2</p>
          <p style="margin:0;font-size:12px;color:${C.faint};">電話：0972-619-391</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
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
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:${C.green};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
          <div style="font-size:14px;font-weight:700;color:${C.white};letter-spacing:2px;">🍃 新體驗預約</div>
          <div style="font-size:22px;font-weight:700;color:${C.white};margin-top:4px;">霧抉茶後台</div>
        </td></tr>

        <tr><td style="background:${C.white};padding:40px;">
          <h2 style="margin:0 0 20px;font-size:18px;color:${C.text};">有新的體驗預約進來了！</h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;width:90px;">預約編號</td><td style="color:${C.text};font-size:13px;font-weight:700;font-family:monospace;">#${shortBid}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">訂購人</td><td style="color:${C.text};font-size:13px;">${safeName}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">Email</td><td style="color:${C.text};font-size:13px;">${escapeHtml(data.bookerEmail)}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">體驗</td><td style="color:${C.text};font-size:13px;font-weight:600;">${safeExp}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">日期</td><td style="color:${C.text};font-size:13px;">${dateLabel} ${data.startTime.slice(0, 5)}</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">人數</td><td style="color:${C.text};font-size:13px;">${data.participantCount} 人</td></tr>
            <tr><td style="color:${C.muted};font-size:13px;padding:4px 0;">金額</td><td style="color:${C.green};font-size:16px;font-weight:700;">NT$ ${data.totalPrice.toLocaleString()}</td></tr>
          </table>
        </td></tr>

        <tr><td style="background:${C.cream};border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${C.faint};">請至後台查看完整預約詳情</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `【新預約】${safeName} — ${safeExp} ${data.sessionDate} ${data.startTime.slice(0, 5)}｜${data.participantCount}人`,
    html,
  });
}

// ─── 點數到期提醒 ─────────────────────────────────────────────────────────

export async function sendPointsExpiryEmail(data: {
  customerEmail: string;
  customerName: string;
  expiringPoints: number;
  expiryDate: string;
  daysLeft: number;
}) {
  const safeName = data.customerName.replace(/</g, "&lt;");
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:24px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:${C.white};border-radius:12px;overflow:hidden;">
        <tr><td style="background:${C.text};padding:20px 28px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:${C.creamDark};">霧抉茶 WuJue Tea</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 12px;font-size:15px;color:${C.text};">親愛的 ${safeName} 您好，</p>
          <p style="margin:0 0 16px;font-size:14px;color:${C.sage};line-height:1.6;">
            您有 <strong style="color:${C.warn};">NT$${data.expiringPoints}</strong> 的點數將於
            <strong>${data.expiryDate}</strong>（${data.daysLeft} 天後）到期。
          </p>
          <p style="margin:0 0 20px;font-size:14px;color:${C.sage};">到期後點數將無法使用，建議您盡快至商城選購心儀商品，使用點數折抵！</p>
          <a href="https://taiwantea.store/products" style="display:inline-block;padding:10px 24px;background:${C.green};color:${C.white};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">立即選購</a>
        </td></tr>
        <tr><td style="padding:0 28px 20px;">
          <p style="margin:0;font-size:11px;color:${C.faint};">此為系統自動通知，如有疑問請聯繫客服。</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await getResend().emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `【霧抉茶】您有 NT$${data.expiringPoints} 點數即將到期（${data.daysLeft} 天後）`,
    html,
  });
}

// ─── 升等通知 ─────────────────────────────────────────────────────────────

export async function sendTierUpgradeEmail(data: {
  customerEmail: string;
  customerName: string;
  newTierName: string;
  pointsRate: number;
  maxDiscountRate: number;
}) {
  const safeName = data.customerName.replace(/</g, "&lt;");
  const ratePercent = Math.round(data.pointsRate * 100);
  const discountPercent = Math.round(data.maxDiscountRate * 100);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:24px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:${C.white};border-radius:12px;overflow:hidden;">
        <tr><td style="background:${C.text};padding:20px 28px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:${C.creamDark};">霧抉茶 WuJue Tea</p>
        </td></tr>
        <tr><td style="padding:28px;text-align:center;">
          <p style="margin:0 0 8px;font-size:24px;">🎉</p>
          <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:${C.text};">恭喜升等為${data.newTierName}！</p>
          <p style="margin:0 0 12px;font-size:15px;color:${C.text};">親愛的 ${safeName} 您好，</p>
          <p style="margin:0 0 16px;font-size:14px;color:${C.sage};line-height:1.6;">
            您已成功升等為 <strong style="color:${C.green};">${data.newTierName}</strong>，享有以下專屬權益：
          </p>
          <table width="100%" cellpadding="8" style="font-size:14px;color:${C.text};border-collapse:collapse;">
            <tr style="background:${C.cream};"><td>消費回饋率</td><td style="font-weight:700;">${ratePercent}%</td></tr>
            <tr><td>點數折抵上限</td><td style="font-weight:700;">${discountPercent}%</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 28px 20px;text-align:center;">
          <a href="https://taiwantea.store/account" style="display:inline-block;padding:10px 24px;background:${C.green};color:${C.white};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">查看會員權益</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await getResend().emails.send({
    from: FROM,
    to: data.customerEmail,
    subject: `【霧抉茶】恭喜！您已升等為${data.newTierName} 🎉`,
    html,
  });
}

// ─── 異常告警（寄給管理員）─────────────────────────────────────────────────

export async function sendAnomalyAlertEmail(data: {
  anomalies: { userId: string; type: string; detail: string }[];
  date: string;
}) {
  const rows = data.anomalies.map(a =>
    `<tr><td style="padding:6px 8px;border:1px solid ${C.gray};">${a.userId.slice(0, 8)}...</td>` +
    `<td style="padding:6px 8px;border:1px solid ${C.gray};">${a.type}</td>` +
    `<td style="padding:6px 8px;border:1px solid ${C.gray};">${a.detail}</td></tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;">
  <h2 style="color:${C.warn};">點數異常告警 — ${data.date}</h2>
  <p>以下為今日偵測到的異常事件：</p>
  <table style="border-collapse:collapse;width:100%;font-size:13px;">
    <tr style="background:${C.grayBg};"><th style="padding:8px;border:1px solid ${C.gray};">用戶</th><th style="padding:8px;border:1px solid ${C.gray};">類型</th><th style="padding:8px;border:1px solid ${C.gray};">詳情</th></tr>
    ${rows}
  </table>
  <p style="margin-top:16px;font-size:12px;color:${C.grayText};">此為系統自動告警，請至後台查看詳情。</p>
</body></html>`;

  await getResend().emails.send({
    from: FROM,
    to: ADMIN,
    subject: `【告警】點數異常 — ${data.date}（${data.anomalies.length} 筆）`,
    html,
  });
}
