import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const MERCHANT  = process.env.ECPAY_MERCHANT_ID!;
const HASH_KEY  = process.env.ECPAY_LOGISTICS_HASH_KEY!;
const HASH_IV   = process.env.ECPAY_LOGISTICS_HASH_IV!;
const MAP_URL   = "https://logistics.ecpay.com.tw/Express/map";

const CVS_SUBTYPE: Record<string, string> = {
  seven:  "UNIMARTC2C",
  family: "FAMIC2C",
  hilife: "HILIFEC2C",
  ok:     "OKMARTC2C",
};

// Nonce store：記錄合法的 MerchantTradeNo，callback 時驗證
// TTL 10 分鐘，超過自動清除
const nonceStore = new Map<string, number>();
const NONCE_TTL = 10 * 60 * 1000;

export function verifyAndConsumeNonce(tradeNo: string): boolean {
  const ts = nonceStore.get(tradeNo);
  if (!ts) return false;
  nonceStore.delete(tradeNo);
  if (Date.now() - ts > NONCE_TTL) return false;
  // 清除過期 nonce
  for (const [key, val] of nonceStore) {
    if (Date.now() - val > NONCE_TTL) nonceStore.delete(key);
  }
  return true;
}

function phpUrlencode(input: string): string {
  const SAFE = /^[A-Za-z0-9\-_.]$/;
  let out = "";
  for (const char of input) {
    if (char === " ")         out += "+";
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
  return createHash("md5").update(encoded).digest("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  const { cvsCompany } = await req.json() as { cvsCompany: string };
  const subtype = CVS_SUBTYPE[cvsCompany];
  if (!subtype) {
    return NextResponse.json({ error: "無效的超商類型" }, { status: 400 });
  }

  const base     = process.env.NEXT_PUBLIC_BASE_URL!;
  const tradeNo  = `M${Date.now()}${randomBytes(2).toString("hex")}`.slice(0, 20);

  // 記錄 nonce
  nonceStore.set(tradeNo, Date.now());

  const params: Record<string, string> = {
    MerchantID:       MERCHANT,
    MerchantTradeNo:  tradeNo,
    LogisticsType:    "CVS",
    LogisticsSubType: subtype,
    IsCollection:     "N",
    ServerReplyURL:   `${base}/api/ecpay/cvs-callback`,
  };
  params.CheckMacValue = buildCheckMacValue(params);

  return NextResponse.json({ actionUrl: MAP_URL, params });
}
