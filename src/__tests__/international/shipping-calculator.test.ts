import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPEC_WEIGHT_G,
  INTERNATIONAL_FREE_SHIPPING_THRESHOLD,
  EPACKET_MAX_WEIGHT_G,
  getItemWeightG,
  calcTotalWeightG,
  calcDomesticFee,
  DOMESTIC_FEES,
} from "@/lib/shipping-constants";

describe("DEFAULT_SPEC_WEIGHT_G", () => {
  it("has correct default weights", () => {
    expect(DEFAULT_SPEC_WEIGHT_G["150g"]).toBe(200);
    expect(DEFAULT_SPEC_WEIGHT_G["75g"]).toBe(120);
    expect(DEFAULT_SPEC_WEIGHT_G["teabag"]).toBe(150);
  });

  it("INTERNATIONAL_FREE_SHIPPING_THRESHOLD is 2500", () => {
    expect(INTERNATIONAL_FREE_SHIPPING_THRESHOLD).toBe(2500);
  });

  it("EPACKET_MAX_WEIGHT_G is 2000", () => {
    expect(EPACKET_MAX_WEIGHT_G).toBe(2000);
  });
});

describe("getItemWeightG", () => {
  it("returns default weight when no product provided", () => {
    expect(getItemWeightG("150g")).toBe(200);
    expect(getItemWeightG("75g")).toBe(120);
    expect(getItemWeightG("teabag")).toBe(150);
  });

  it("returns default weight when product has no custom weight", () => {
    expect(getItemWeightG("150g", {})).toBe(200);
    expect(getItemWeightG("75g", { shippingWeight75g: null })).toBe(120);
  });

  it("returns custom weight from product when available", () => {
    expect(getItemWeightG("150g", { shippingWeight150g: 250 })).toBe(250);
    expect(getItemWeightG("75g", { shippingWeight75g: 100 })).toBe(100);
    expect(getItemWeightG("teabag", { shippingWeightTeabag: 180 })).toBe(180);
  });

  it("falls back to 150g default for unknown spec", () => {
    expect(getItemWeightG("unknown")).toBe(200);
  });
});

describe("calcTotalWeightG", () => {
  it("calculates weight for single item", () => {
    expect(calcTotalWeightG([{ spec: "150g", quantity: 1 }])).toBe(200);
  });

  it("calculates weight for multiple items of same spec", () => {
    expect(calcTotalWeightG([{ spec: "150g", quantity: 3 }])).toBe(600);
  });

  it("calculates weight for mixed specs", () => {
    const items = [
      { spec: "150g", quantity: 2 },
      { spec: "75g", quantity: 1 },
      { spec: "teabag", quantity: 1 },
    ];
    expect(calcTotalWeightG(items)).toBe(200 * 2 + 120 + 150);
  });

  it("uses custom product weight when provided", () => {
    const items = [
      { spec: "150g", quantity: 2, product: { shippingWeight150g: 250 } },
    ];
    expect(calcTotalWeightG(items)).toBe(500);
  });

  it("mixes custom and default weights", () => {
    const items = [
      { spec: "150g", quantity: 1, product: { shippingWeight150g: 300 } },
      { spec: "75g", quantity: 1 }, // no product, uses default
    ];
    expect(calcTotalWeightG(items)).toBe(300 + 120);
  });

  it("returns 0 for empty items", () => {
    expect(calcTotalWeightG([])).toBe(0);
  });
});

describe("calcDomesticFee", () => {
  it("returns 0 for home delivery when subtotal >= 1000", () => {
    expect(calcDomesticFee("home", 1000)).toBe(0);
    expect(calcDomesticFee("home", 2000)).toBe(0);
  });

  it("returns 150 for home delivery when subtotal < 1000", () => {
    expect(calcDomesticFee("home", 999)).toBe(150);
    expect(calcDomesticFee("home", 0)).toBe(150);
  });

  // 文案與計算必須讀同一組值。shippingOptions 原本硬寫「宅配 NT$250」，
  // 費率一改就會對客人講錯價——這條把顯示值釘回計算值
  it("DOMESTIC_FEES 與 calcDomesticFee 同源", () => {
    expect(calcDomesticFee("home", 0)).toBe(DOMESTIC_FEES.home);
    expect(calcDomesticFee("cvs", 0)).toBe(DOMESTIC_FEES.cvs);
  });

  it("returns 0 for cvs when subtotal >= 1000", () => {
    expect(calcDomesticFee("cvs", 1000)).toBe(0);
    expect(calcDomesticFee("cvs", 1500)).toBe(0);
  });

  it("returns 60 for cvs when subtotal < 1000", () => {
    expect(calcDomesticFee("cvs", 999)).toBe(60);
    expect(calcDomesticFee("cvs", 500)).toBe(60);
  });
});

describe("International shipping fee calculation (formula)", () => {
  // Fee = baseFee + Math.ceil((weight - 100) / 100) * perExtra
  it("calculates Zone ASIA_1 (JP) base case: 200g", () => {
    const baseFee = 160, perExtra = 10;
    const weight = 200;
    const fee = baseFee + Math.ceil((weight - 100) / 100) * perExtra;
    expect(fee).toBe(170); // 160 + ceil(100/100)*10 = 160+10
  });

  it("calculates Zone ASIA_2 (SG) for 400g", () => {
    const baseFee = 200, perExtra = 14;
    const weight = 400;
    const fee = baseFee + Math.ceil((weight - 100) / 100) * perExtra;
    expect(fee).toBe(242); // 200 + ceil(300/100)*14 = 200+42
  });

  it("calculates Zone NA_OC (US) for 1000g", () => {
    const baseFee = 280, perExtra = 18;
    const weight = 1000;
    const fee = baseFee + Math.ceil((weight - 100) / 100) * perExtra;
    expect(fee).toBe(442); // 280 + ceil(900/100)*18 = 280+162
  });

  it("calculates Zone EU_1 (DE) for 600g", () => {
    const baseFee = 280, perExtra = 18;
    const weight = 600;
    const fee = baseFee + Math.ceil((weight - 100) / 100) * perExtra;
    expect(fee).toBe(370); // 280 + ceil(500/100)*18 = 280+90
  });

  it("calculates Zone EU_2 for 2000g (max)", () => {
    const baseFee = 330, perExtra = 22;
    const weight = 2000;
    const fee = baseFee + Math.ceil((weight - 100) / 100) * perExtra;
    expect(fee).toBe(748); // 330 + ceil(1900/100)*22 = 330+418
  });

  it("free shipping when subtotal >= 2500", () => {
    const subtotal = 2500;
    expect(subtotal >= INTERNATIONAL_FREE_SHIPPING_THRESHOLD).toBe(true);
  });

  it("not free when subtotal < 2500", () => {
    expect(2499 >= INTERNATIONAL_FREE_SHIPPING_THRESHOLD).toBe(false);
  });

  it("overweight check: > 2000g", () => {
    // 11 items of 150g = 11 * 200 = 2200g > 2000g
    const weight = calcTotalWeightG([{ spec: "150g", quantity: 11 }]);
    expect(weight).toBe(2200);
    expect(weight > EPACKET_MAX_WEIGHT_G).toBe(true);
  });

  it("exactly at weight limit: 2000g", () => {
    // 10 items of 150g = 10 * 200 = 2000g
    const weight = calcTotalWeightG([{ spec: "150g", quantity: 10 }]);
    expect(weight).toBe(2000);
    expect(weight > EPACKET_MAX_WEIGHT_G).toBe(false);
  });
});
