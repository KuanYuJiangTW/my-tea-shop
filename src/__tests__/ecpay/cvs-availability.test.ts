import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { CVS_COMPANIES, CVS_COD_COMPANIES, CVS_SUBTYPE, isValidCvs, cvsSupportsCod } from "@/lib/cvs";

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => true,
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/lib/email", () => ({ sendOrderEmails: vi.fn() }));

// 背景（2026-08-01 實測）：
// 1. 綠界正式環境電子地圖對 OKMARTC2C 一律回「OK超商暫停服務(若有寄件需求，
//    請使用711、全家、萊爾富)」，不分 IsCollection——OK 全面不可用。
// 2. 綠界測試環境（官方 C2C 測試特店 2000933）以 HILIFEC2C + IsCollection=Y
//    建單成立，萊爾富可代收貨款。代收是賣家在綠界後台建單時設定，門市櫃台不經手。

describe("超商可用性清單", () => {
  it("可選超商只有 7-ELEVEN、全家、萊爾富——OK 已被綠界停用", () => {
    expect([...CVS_COMPANIES].sort()).toEqual(["family", "hilife", "seven"]);
    expect(isValidCvs("ok")).toBe(false);
  });

  it("物流子類型不含 OKMARTC2C", () => {
    expect(Object.values(CVS_SUBTYPE)).not.toContain("OKMARTC2C");
    expect(CVS_SUBTYPE.seven).toBe("UNIMARTC2C");
    expect(CVS_SUBTYPE.family).toBe("FAMIC2C");
    expect(CVS_SUBTYPE.hilife).toBe("HILIFEC2C");
  });

  it("三家可選超商都支援代收貨款；已停用的 OK 不在其中", () => {
    expect([...CVS_COD_COMPANIES].sort()).toEqual(["family", "hilife", "seven"]);
    expect(cvsSupportsCod("hilife")).toBe(true);
    expect(cvsSupportsCod("ok")).toBe(false);
  });

  it("可代收清單必為可選清單的子集", () => {
    for (const c of CVS_COD_COMPANIES) {
      expect(CVS_COMPANIES).toContain(c);
    }
  });
});

describe("cvs-map 路由", () => {
  beforeEach(() => {
    vi.stubEnv("ECPAY_MERCHANT_ID", "2000132");
    vi.stubEnv("ECPAY_LOGISTICS_HASH_KEY", "XBERn1YOvpM9nfZc");
    vi.stubEnv("ECPAY_LOGISTICS_HASH_IV", "h1ONHk4P4yqbl5LK");
    vi.stubEnv("ECPAY_HASH_KEY", "5294y06JbISpM5x9");
    vi.stubEnv("ECPAY_HASH_IV", "v77hoKGq4kWxNNIS");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://taiwantea.store");
  });
  afterEach(() => vi.unstubAllEnvs());

  function makeReq(body: unknown) {
    return new NextRequest("http://localhost/api/ecpay/cvs-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function post(body: unknown) {
    const { POST } = await import("@/app/api/ecpay/cvs-map/route");
    return POST(makeReq(body));
  }

  it("OK 超商 → 400", async () => {
    const res = await post({ cvsCompany: "ok" });
    expect(res.status).toBe(400);
  });

  it("萊爾富＋不代收 → 200，子類型為 HILIFEC2C、IsCollection=N", async () => {
    const res = await post({ cvsCompany: "hilife", isCollection: false });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.params.LogisticsSubType).toBe("HILIFEC2C");
    expect(json.params.IsCollection).toBe("N");
  });

  it("萊爾富＋代收貨款 → 200 且 IsCollection=Y", async () => {
    const res = await post({ cvsCompany: "hilife", isCollection: true });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.params.LogisticsSubType).toBe("HILIFEC2C");
    expect(json.params.IsCollection).toBe("Y");
  });

  it("7-ELEVEN＋代收貨款 → 200 且 IsCollection=Y", async () => {
    const res = await post({ cvsCompany: "seven", isCollection: true });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.params.LogisticsSubType).toBe("UNIMARTC2C");
    expect(json.params.IsCollection).toBe("Y");
  });

  it("全家＋代收貨款 → 200 且 IsCollection=Y", async () => {
    const res = await post({ cvsCompany: "family", isCollection: true });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.params.LogisticsSubType).toBe("FAMIC2C");
    expect(json.params.IsCollection).toBe("Y");
  });
});

describe("建立訂單時的超商限制（/api/orders）", () => {
  const BASE = {
    customer: { name: "測試客戶", phone: "0912345678", email: "test@example.com" },
    deliveryType: "cvs",
    items: [{ productId: 1, quantity: 1 }],
  };

  async function post(body: unknown) {
    const { POST } = await import("@/app/api/orders/route");
    return POST(new NextRequest("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
  }

  // 註：目前三家可選超商都支援代收，故 cvsSupportsCod 的路由層防線沒有可觸發的
  // 真實輸入值；該防線由上面的單元測試（CVS_COD_COMPANIES / cvsSupportsCod）守住。

  it("貨到付款＋OK 超商 → 400（OK 已停用）", async () => {
    const res = await post({
      ...BASE,
      paymentMethod: "cod",
      cvsInfo: { company: "ok", storeId: "O001", storeName: "OK 信義店" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("無效的超商類型");
  });

  it("線上付款＋OK 超商 → 400（OK 已停用）", async () => {
    const res = await post({
      ...BASE,
      paymentMethod: "online",
      cvsInfo: { company: "ok", storeId: "O001", storeName: "OK 信義店" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("無效的超商類型");
  });
});
