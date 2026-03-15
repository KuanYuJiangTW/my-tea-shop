import { NextRequest, NextResponse } from "next/server";

// 綠界付款完成後 POST 到此，轉址到結果頁面（帶 GET 參數）
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params = new URLSearchParams();

  formData.forEach((value, key) => {
    params.set(key, String(value));
  });

  const host = req.headers.get("origin") || "http://localhost:3000";
  return NextResponse.redirect(`${host}/order/result?${params.toString()}`);
}
