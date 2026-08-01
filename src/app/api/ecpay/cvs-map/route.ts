import { createHash, createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CVS_SUBTYPE, cvsSupportsCod, isValidCvs } from "@/lib/cvs";

const MERCHANT  = process.env.ECPAY_MERCHANT_ID!;
const HASH_KEY  = process.env.ECPAY_LOGISTICS_HASH_KEY!;
const HASH_IV   = process.env.ECPAY_LOGISTICS_HASH_IV!;
const MAP_URL   = "https://logistics.ecpay.com.tw/Express/map";

// HMAC secret for signing MerchantTradeNo
const HMAC_SECRET = process.env.ECPAY_HASH_KEY! + process.env.ECPAY_HASH_IV!;

/**
 * 產生帶簽名的 MerchantTradeNo
 * 格式: M{timestamp13}{hmac6} = 20 chars
 */
export function createSignedTradeNo(): string {
  const ts = String(Date.now());
  const sig = createHmac("sha256", HMAC_SECRET).update(ts).digest("hex").slice(0, 6).toUpperCase();
  return `M${ts}${sig}`;
}

/**
 * 驗證 MerchantTradeNo 的簽名
 */
export function verifyTradeNo(tradeNo: string): boolean {
  if (!tradeNo || tradeNo.length !== 20 || !tradeNo.startsWith("M")) return false;
  const ts  = tradeNo.slice(1, 14);
  const sig = tradeNo.slice(14);
  const expected = createHmac("sha256", HMAC_SECRET).update(ts).digest("hex").slice(0, 6).toUpperCase();
  if (sig !== expected) return false;
  // 檢查 10 分鐘內
  const elapsed = Date.now() - Number(ts);
  return elapsed < 10 * 60 * 1000 && elapsed >= 0;
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
  const { cvsCompany, isCollection } = await req.json() as { cvsCompany: string; isCollection?: boolean };
  if (!isValidCvs(cvsCompany)) {
    return NextResponse.json({ error: "無效的超商類型" }, { status: 400 });
  }
  // 不代收貨款的超商不得搭配貨到付款（清單見 lib/cvs.ts）
  if (isCollection && !cvsSupportsCod(cvsCompany)) {
    return NextResponse.json({ error: "此超商不支援貨到付款" }, { status: 400 });
  }

  const base     = process.env.NEXT_PUBLIC_BASE_URL!;
  const tradeNo  = createSignedTradeNo();

  const params: Record<string, string> = {
    MerchantID:       MERCHANT,
    MerchantTradeNo:  tradeNo,
    LogisticsType:    "CVS",
    LogisticsSubType: CVS_SUBTYPE[cvsCompany],
    IsCollection:     isCollection ? "Y" : "N",
    ServerReplyURL:   `${base}/api/ecpay/cvs-callback`,
  };
  params.CheckMacValue = buildCheckMacValue(params);

  return NextResponse.json({ actionUrl: MAP_URL, params });
}
