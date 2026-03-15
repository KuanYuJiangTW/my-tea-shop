// 綠界 server-side 付款通知（POST），必須回應 1|OK
export async function POST() {
  return new Response("1|OK", {
    headers: { "Content-Type": "text/plain" },
  });
}
