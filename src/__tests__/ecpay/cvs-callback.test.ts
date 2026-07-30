import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// 簽名驗證另有其邏輯，這裡專注在回應 HTML 的注入面
vi.mock("@/app/api/ecpay/cvs-map/route", () => ({
  verifyTradeNo: (t: string) => t === "VALID",
}));
vi.mock("../../app/api/ecpay/cvs-map/route", () => ({
  verifyTradeNo: (t: string) => t === "VALID",
}));

import { POST } from "@/app/api/ecpay/cvs-callback/route";

function makeReq(fields: Record<string, string>) {
  return new NextRequest("http://localhost/api/ecpay/cvs-callback", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
}

const XSS = `</script><script>window.__pwned=1;</script>`;

describe("cvs-callback 回應 HTML", () => {
  it("簽名無效 → 403", async () => {
    const res = await POST(makeReq({ MerchantTradeNo: "BOGUS" }));
    expect(res.status).toBe(403);
  });

  it("店名含 </script> 時不得產生可跳脫的標籤（回歸：JSON.stringify 不轉義 </script>）", async () => {
    const res = await POST(makeReq({
      MerchantTradeNo: "VALID",
      CVSStoreID: "991182",
      CVSStoreName: XSS,
      CVSAddress: "嘉義縣阿里山鄉",
    }));
    const html = await res.text();

    // 整份回應只能有一個 <script> 開標籤與一個結束標籤——就是我們自己那支
    expect(html.match(/<script/gi)?.length).toBe(1);
    expect(html.match(/<\/script/gi)?.length).toBe(1);

    // 惡意字串必須以實體形式存在，不能是原樣的可執行標籤
    expect(html).not.toContain(XSS);
    expect(html).toContain("&lt;/script&gt;");

    // 攻擊字串的內容仍會以「資料」形式出現（已轉義），但不得落在 script 區塊內
    const scriptBody = html.slice(html.indexOf("<script"), html.indexOf("</script"));
    expect(scriptBody).not.toContain("__pwned");
  });

  it("引號無法跳脫 data 屬性", async () => {
    const res = await POST(makeReq({
      MerchantTradeNo: "VALID",
      CVSStoreName: `" onload="alert(1)`,
      CVSAddress: `' onerror='alert(2)`,
    }));
    const html = await res.text();

    // 屬性值以雙引號界定；值內若有未轉義的 " 就能跳脫出來加新屬性
    const attr = html.match(/data-payload="([^"]*)"/)?.[1] ?? "";
    expect(attr).not.toContain(`"`);
    expect(attr).toContain("&quot;");
    expect(attr).toContain("&#39;");

    // div 上只有 id / data-payload / data-origin 三個屬性。
    // 因為所有 " 都已轉義，值內不可能出現 `="`，所以數 `="` 就等於數屬性個數。
    const divTag = html.match(/<div[^>]*>/)?.[0] ?? "";
    expect(divTag.match(/="/g)?.length).toBe(3);
  });

  it("CSP 不再含 unsafe-inline，改用 nonce", async () => {
    const res = await POST(makeReq({ MerchantTradeNo: "VALID", CVSStoreName: "阿里山門市" }));
    const csp = res.headers.get("Content-Security-Policy") ?? "";

    expect(csp).not.toContain("unsafe-inline");
    expect(csp).toMatch(/script-src 'nonce-[A-Za-z0-9+/=]+'/);

    // 標籤上的 nonce 必須與標頭一致，否則 script 不會執行
    const html = await res.text();
    const headerNonce = csp.match(/'nonce-([^']+)'/)?.[1];
    expect(html).toContain(`nonce="${headerNonce}"`);
  });

  it("每次請求的 nonce 都不同", async () => {
    const csp1 = (await POST(makeReq({ MerchantTradeNo: "VALID" }))).headers.get("Content-Security-Policy");
    const csp2 = (await POST(makeReq({ MerchantTradeNo: "VALID" }))).headers.get("Content-Security-Policy");
    expect(csp1).not.toBe(csp2);
  });

  it("正常店家資料可被還原（不因轉義而失真）", async () => {
    const res = await POST(makeReq({
      MerchantTradeNo: "VALID",
      CVSStoreID: "991182",
      CVSStoreName: "7-ELEVEN 阿里山門市",
      CVSAddress: "嘉義縣阿里山鄉中正村 1 號",
    }));
    const html = await res.text();

    const encoded = html.match(/data-payload="([^"]*)"/)?.[1] ?? "";
    // 模擬瀏覽器讀 data 屬性時的實體還原
    const decoded = encoded
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

    expect(JSON.parse(decoded)).toEqual({
      type: "cvs-selected",
      storeId: "991182",
      storeName: "7-ELEVEN 阿里山門市",
      address: "嘉義縣阿里山鄉中正村 1 號",
    });
  });

  it("超長欄位被截斷", async () => {
    const res = await POST(makeReq({
      MerchantTradeNo: "VALID",
      CVSStoreName: "港".repeat(5000),
    }));
    const html = await res.text();
    const encoded = html.match(/data-payload="([^"]*)"/)?.[1] ?? "";
    const decoded = encoded.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    expect(JSON.parse(decoded).storeName.length).toBe(200);
  });
});
