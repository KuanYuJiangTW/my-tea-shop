import { NextResponse } from "next/server";

// 綠界 server-side 付款通知，必須回應 1|OK
export async function POST() {
  return new NextResponse("1|OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
