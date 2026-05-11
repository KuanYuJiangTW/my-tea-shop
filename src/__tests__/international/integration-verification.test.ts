import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const rootDir = path.resolve(__dirname, "../../..");

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf-8");
}

describe("File existence checks", () => {
  it("shipping-constants.ts exists", () => {
    expect(fileExists("src/lib/shipping-constants.ts")).toBe(true);
  });

  it("shipping.ts exists", () => {
    expect(fileExists("src/lib/shipping.ts")).toBe(true);
  });

  it("shipping countries API route exists", () => {
    expect(fileExists("src/app/api/shipping/countries/route.ts")).toBe(true);
  });

  it("CheckoutClient.tsx exists", () => {
    expect(fileExists("src/app/checkout/CheckoutClient.tsx")).toBe(true);
  });

  it("SQL migration file exists", () => {
    expect(fileExists("supabase/add_shipping_tables.sql")).toBe(true);
  });
});

describe("DeliveryType includes international", () => {
  it("types/index.ts exports DeliveryType with international", () => {
    const content = readFile("src/types/index.ts");
    expect(content).toContain('"international"');
    expect(content).toContain("DeliveryType");
  });

  it("InternationalAddress interface exists", () => {
    const content = readFile("src/types/index.ts");
    expect(content).toContain("InternationalAddress");
    expect(content).toContain("addressLine1");
    expect(content).toContain("postalCode");
  });

  it("CreateOrderRequest includes internationalAddress", () => {
    const content = readFile("src/types/index.ts");
    expect(content).toContain("internationalAddress");
  });

  it("Product type includes shipping weight fields", () => {
    const content = readFile("src/types/index.ts");
    expect(content).toContain("shippingWeight150g");
    expect(content).toContain("shippingWeight75g");
    expect(content).toContain("shippingWeightTeabag");
  });
});

describe("Translation keys exist", () => {
  it("zh.json has international shipping keys", () => {
    const content = readFile("messages/zh.json");
    const json = JSON.parse(content);
    expect(json.checkout.regionLabel).toBeDefined();
    expect(json.checkout.regionInternational).toBeDefined();
    expect(json.checkout.intlCountry).toBeDefined();
    expect(json.checkout.intlAddressLine1).toBeDefined();
    expect(json.checkout.intlOverweight).toBeDefined();
    expect(json.checkout.intlDisclaimer).toBeDefined();
    expect(json.checkout.intlPaypalOnly).toBeDefined();
  });

  it("en.json has international shipping keys", () => {
    const content = readFile("messages/en.json");
    const json = JSON.parse(content);
    expect(json.checkout.regionLabel).toBeDefined();
    expect(json.checkout.regionInternational).toBeDefined();
    expect(json.checkout.intlCountry).toBeDefined();
    expect(json.checkout.intlAddressLine1).toBeDefined();
    expect(json.checkout.intlOverweight).toBeDefined();
    expect(json.checkout.intlDisclaimer).toBeDefined();
    expect(json.checkout.intlPaypalOnly).toBeDefined();
  });

  it("zh.json has international error keys", () => {
    const content = readFile("messages/zh.json");
    const json = JSON.parse(content);
    expect(json.checkout.errors.intlPhoneInvalid).toBeDefined();
    expect(json.checkout.errors.intlCountryRequired).toBeDefined();
    expect(json.checkout.errors.intlAddressRequired).toBeDefined();
  });

  it("zh.json has order result international keys", () => {
    const content = readFile("messages/zh.json");
    const json = JSON.parse(content);
    expect(json.orderResult.intlNoticeTitle).toBeDefined();
    expect(json.orderResult.intlNoticeDays).toBeDefined();
    expect(json.orderResult.intlNoticeDuty).toBeDefined();
  });
});

describe("Code pattern checks", () => {
  it("CheckoutClient imports shipping-constants", () => {
    const content = readFile("src/app/checkout/CheckoutClient.tsx");
    expect(content).toContain("shipping-constants");
  });

  it("CheckoutClient has region selector", () => {
    const content = readFile("src/app/checkout/CheckoutClient.tsx");
    expect(content).toContain("regionDomestic");
    expect(content).toContain("regionInternational");
  });

  it("CheckoutClient has international phone regex", () => {
    const content = readFile("src/app/checkout/CheckoutClient.tsx");
    expect(content).toContain("intlPhoneRegex");
  });

  it("PayPal create-order route validates international address", () => {
    const content = readFile("src/app/api/paypal/create-order/route.ts");
    expect(content).toContain('deliveryType === "international"');
    expect(content).toContain("internationalAddress");
  });

  it("Email module supports international shipping address", () => {
    const content = readFile("src/lib/email.ts");
    expect(content).toContain('"international"');
    expect(content).toContain("countryName");
  });

  it("Admin order detail page supports international type", () => {
    const content = readFile("src/app/admin/(protected)/orders/[id]/page.tsx");
    expect(content).toContain('"international"');
  });

  it("Admin order list supports international format", () => {
    const content = readFile("src/app/admin/(protected)/orders/OrdersClient.tsx");
    expect(content).toContain('"international"');
  });

  it("Account page supports international address display", () => {
    const content = readFile("src/app/account/AccountClient.tsx");
    expect(content).toContain('"international"');
  });
});
