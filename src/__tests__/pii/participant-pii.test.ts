import { describe, it, expect } from "vitest";
import {
  isValidTwId,
  validateIdNumber,
  maskIdNumber,
  maskPhone,
  maskDateOfBirth,
  maskParticipant,
} from "@/lib/pii";

describe("身分證字號檢查碼", () => {
  it("接受合法的身分證字號", () => {
    // 檢查碼正確的樣本（非真實個人資料）
    expect(isValidTwId("A123456789")).toBe(true);
    expect(isValidTwId("F131104093")).toBe(true);
  });

  it("拒絕檢查碼錯誤的號碼", () => {
    expect(isValidTwId("A123456788")).toBe(false);
    expect(isValidTwId("A123456780")).toBe(false);
  });

  it("拒絕格式不符的字串", () => {
    expect(isValidTwId("123456789")).toBe(false);   // 缺字母
    expect(isValidTwId("A12345678")).toBe(false);   // 位數不足
    expect(isValidTwId("A3234567890")).toBe(false); // 性別碼非 1/2/8/9
    expect(isValidTwId("AA23456789")).toBe(false);
  });

  it("接受新式外來人口統一證號（性別碼 8/9）", () => {
    // 檢查碼由獨立驗算取得，非沿用本實作的輸出
    expect(isValidTwId("A800000005")).toBe(true);
    expect(isValidTwId("A900000007")).toBe(true);
    // 同號碼但檢查碼錯誤仍須拒絕，確認上面不是因為「8/9 一律放行」而通過
    expect(isValidTwId("A800000004")).toBe(false);
    expect(isValidTwId("A900000006")).toBe(false);
  });

  it("小寫字母會被正規化", () => {
    expect(isValidTwId("a123456789")).toBe(true);
  });
});

describe("validateIdNumber — 需同時容納國人與外籍旅客", () => {
  it("台灣身分證格式必須通過檢查碼", () => {
    const bad = validateIdNumber("A123456788");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("身分證");
  });

  it("合法身分證通過並正規化為大寫", () => {
    const r = validateIdNumber(" a123456789 ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("A123456789");
  });

  it("護照號碼（非台灣身分證格式）以英數字規則放行", () => {
    // 本站有 EN 版與國際配送，硬套台灣檢查碼會把外籍旅客擋在門外
    const r = validateIdNumber("X1234567");
    expect(r.ok).toBe(true);
    const r2 = validateIdNumber("123456789012");
    expect(r2.ok).toBe(true);
  });

  it("拒絕過短、過長與含特殊字元的值", () => {
    expect(validateIdNumber("A12").ok).toBe(false);
    expect(validateIdNumber("A".repeat(21)).ok).toBe(false);
    expect(validateIdNumber("A123-456").ok).toBe(false);
    expect(validateIdNumber("<script>x</script>").ok).toBe(false);
  });
});

describe("遮罩", () => {
  it("身分證號保留前 3 後 2", () => {
    expect(maskIdNumber("A123456789")).toBe("A12*****89");
  });

  it("遮罩後長度不變，且中間確實看不見", () => {
    const masked = maskIdNumber("A123456789");
    expect(masked.length).toBe(10);
    expect(masked).not.toContain("3456");
  });

  it("短號碼全遮蔽，避免反推", () => {
    expect(maskIdNumber("A1234")).toBe("*****");
  });

  it("空值不會爆", () => {
    expect(maskIdNumber(null)).toBe("");
    expect(maskIdNumber(undefined)).toBe("");
    expect(maskPhone(null)).toBe("");
    expect(maskDateOfBirth(null)).toBe("");
  });

  it("電話保留末 3 碼", () => {
    expect(maskPhone("0912345678")).toBe("*******678");
  });

  it("生日只留年份", () => {
    expect(maskDateOfBirth("1990-05-12")).toBe("1990-**-**");
    expect(maskDateOfBirth("bogus")).toBe("****-**-**");
  });
});

describe("maskParticipant — 回傳給前端的形狀", () => {
  const raw = {
    id: "p1",
    booking_id: "b1",
    is_primary: true,
    name: "王小明",
    id_number: "A123456789",
    date_of_birth: "1990-05-12",
    emergency_contact_name: "王大明",
    emergency_contact_phone: "0912345678",
  };

  it("敏感欄位全部被遮罩", () => {
    const m = maskParticipant(raw);
    expect(m.id_number).toBe("A12*****89");
    expect(m.date_of_birth).toBe("1990-**-**");
    expect(m.emergency_contact_phone).toBe("*******678");
  });

  it("完整的原始值不會出現在序列化結果裡（回歸：曾直接回傳 select(*)）", () => {
    const json = JSON.stringify(maskParticipant(raw));
    expect(json).not.toContain("A123456789");
    expect(json).not.toContain("1990-05-12");
    expect(json).not.toContain("0912345678");
  });

  it("非敏感欄位保持原樣（姓名仍需顯示以辨識是哪一位）", () => {
    const m = maskParticipant(raw);
    expect(m.name).toBe("王小明");
    expect(m.is_primary).toBe(true);
    expect(m.id).toBe("p1");
  });
});
