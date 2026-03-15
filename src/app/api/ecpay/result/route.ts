import { NextRequest, NextResponse } from "next/server";

// 綠界付款完成後 POST 到此，轉址到結果頁（帶 GET 參數）
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params   = new URLSearchParams();
  formData.forEach((value, key) => params.set(key, String(value)));

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.nextUrl.host}`;

  return NextResponse.redirect(`${base}/order/result?${params.toString()}`, { status: 302 });
}
