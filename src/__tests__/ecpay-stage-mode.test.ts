import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * 綠界正式站／測試站的切換。
 *
 * 這個檔案守的是**「正式站不可能變成測試模式」**。在正式站切測試模式的後果
 * 是真實客人付不了錢，而且完全無聲——表單照送、綠界測試站照回應，只是錢
 * 永遠不會進帳。這種錯誤不會有 exception、不會進 error log，只會在對帳時才
 * 發現，而那已經是好幾天之後。
 *
 * 模組讀的是載入當下的 `process.env`，所以每一條都要重設環境並清模組快取。
 */

const load = async () => {
  vi.resetModules();
  return await import("@/lib/ecpay-env");
};

const ORIGINAL = { ...process.env };
beforeEach(() => {
  delete process.env.ECPAY_MODE;
  delete process.env.VERCEL_ENV;
});
afterEach(() => { process.env = { ...ORIGINAL }; });

describe("預設行為：不設任何東西就是正式站", () => {
  it("沒有 ECPAY_MODE → 正式端點", async () => {
    const m = await load();
    expect(m.ECPAY_STAGE).toBe(false);
    expect(m.ECPAY_CHECKOUT_URL).toBe("https://payment.ecpay.com.tw/Cashier/AioCheckout/index");
  });

  it("ECPAY_MODE 是別的值也不會誤觸發", async () => {
    for (const v of ["", "live", "test", "STAGE", "1", "true"]) {
      process.env.ECPAY_MODE = v;
      const m = await load();
      expect(m.ECPAY_STAGE, `ECPAY_MODE=${v}`).toBe(false);
    }
  });
});

describe("測試模式只在非 production 生效", () => {
  it("preview 部署 → 測試端點", async () => {
    process.env.ECPAY_MODE = "stage";
    process.env.VERCEL_ENV = "preview";
    const m = await load();
    expect(m.ECPAY_STAGE).toBe(true);
    expect(m.ECPAY_CHECKOUT_URL).toBe("https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/index");
  });

  it("本機開發（沒有 VERCEL_ENV）→ 測試端點", async () => {
    process.env.ECPAY_MODE = "stage";
    const m = await load();
    expect(m.ECPAY_STAGE).toBe(true);
  });

  // ── 本檔最重要的一條 ──────────────────────────────────────
  it("**production 即使設了 stage 也必須是正式端點**", async () => {
    process.env.ECPAY_MODE = "stage";
    process.env.VERCEL_ENV = "production";
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const m = await load();
    expect(m.ECPAY_STAGE).toBe(false);
    expect(m.ECPAY_CHECKOUT_URL).toBe("https://payment.ecpay.com.tw/Cashier/AioCheckout/index");
    expect(m.ECPAY_HOST).toBe("payment.ecpay.com.tw");
    err.mockRestore();
  });

  it("被忽略時要在 log 裡講出來——不然設錯的人會以為自己在測試", async () => {
    process.env.ECPAY_MODE = "stage";
    process.env.VERCEL_ENV = "production";
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await load();
    expect(err).toHaveBeenCalled();
    expect(String(err.mock.calls[0][0])).toContain("被忽略");
    err.mockRestore();
  });
});

describe("CSP 必須跟著切，否則表單會被瀏覽器擋掉", () => {
  it("正式模式只放行正式站", async () => {
    const m = await load();
    expect(m.ECPAY_CSP_HOSTS).toBe("https://payment.ecpay.com.tw");
    expect(m.ECPAY_CSP_HOSTS).not.toContain("payment-stage");
  });

  it("測試模式要放行測試站——漏了的話切了 URL 也沒用", async () => {
    process.env.ECPAY_MODE = "stage";
    process.env.VERCEL_ENV = "preview";
    const m = await load();
    expect(m.ECPAY_CSP_HOSTS).toContain("https://payment-stage.ecpay.com.tw");
  });

  it("結帳端點的網域一定在 CSP 放行清單裡", async () => {
    for (const env of [undefined, "preview"]) {
      if (env) { process.env.ECPAY_MODE = "stage"; process.env.VERCEL_ENV = env; }
      const m = await load();
      expect(m.ECPAY_CSP_HOSTS).toContain(`https://${m.ECPAY_HOST}`);
    }
  });
});
