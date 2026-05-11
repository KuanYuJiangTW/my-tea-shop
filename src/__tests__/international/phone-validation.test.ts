import { describe, it, expect } from "vitest";

const phoneRegex = /^09\d{8}$/;
const intlPhoneRegex = /^\+?[\d\s\-()]{7,20}$/;

describe("Taiwan phone validation (domestic)", () => {
  it("accepts valid Taiwan mobile: 0912345678", () => {
    expect(phoneRegex.test("0912345678")).toBe(true);
  });

  it("accepts valid Taiwan mobile: 0987654321", () => {
    expect(phoneRegex.test("0987654321")).toBe(true);
  });

  it("rejects international format in Taiwan regex", () => {
    expect(phoneRegex.test("+886912345678")).toBe(false);
  });

  it("rejects too short", () => {
    expect(phoneRegex.test("091234567")).toBe(false);
  });

  it("rejects too long", () => {
    expect(phoneRegex.test("09123456789")).toBe(false);
  });
});

describe("International phone validation", () => {
  it("accepts Japan format: +81-90-1234-5678", () => {
    expect(intlPhoneRegex.test("+81-90-1234-5678")).toBe(true);
  });

  it("accepts US format: +1-213-456-7890", () => {
    expect(intlPhoneRegex.test("+1-213-456-7890")).toBe(true);
  });

  it("accepts UK format: +44 20 7946 0958", () => {
    expect(intlPhoneRegex.test("+44 20 7946 0958")).toBe(true);
  });

  it("accepts Australia format: +61 2 1234 5678", () => {
    expect(intlPhoneRegex.test("+61 2 1234 5678")).toBe(true);
  });

  it("accepts plain digits: 0312345678", () => {
    expect(intlPhoneRegex.test("0312345678")).toBe(true);
  });

  it("accepts parentheses format: (03)1234-5678", () => {
    expect(intlPhoneRegex.test("(03)1234-5678")).toBe(true);
  });

  it("rejects too short (< 7 digits)", () => {
    expect(intlPhoneRegex.test("+1234")).toBe(false);
  });

  it("rejects letters", () => {
    expect(intlPhoneRegex.test("+81-abc-def")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(intlPhoneRegex.test("")).toBe(false);
  });

  it("rejects too long (> 20 chars)", () => {
    expect(intlPhoneRegex.test("+1-234-567-890-123-456")).toBe(false);
  });
});
