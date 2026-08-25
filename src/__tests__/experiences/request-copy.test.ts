import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import zh from "../../../messages/zh.json";
import en from "../../../messages/en.json";

/**
 * 開課請求文案與計價的一致性。
 *
 * 起因（2026-08-25）：頁面上寫的是「你買的是名額，不是每人票——名額之內要帶
 * 幾個人由你決定」。它只講了門檻那一半，於是業主自己讀了都要問「會不會被
 * 誤會成 1,350 可以帶超過 3 個人？」——**而程式從來不是這樣算的**：
 * `calcRequestSlots` 是 max(最低名額, 實際人數)，第 4 個人就是實實在在多收
 * 一份錢。文案漏掉的正是「超過門檻照人頭加」這句。
 *
 * 這種錯不會有任何測試變紅：函式對、型別對、頁面也 render 得出來，錯的是
 * 那句話少講了一半。所以這支測試釘的是**文案本身**：
 *
 * 1. 中英文都必須把「每多 1 人加多少」講出來（`{price}` 佔位符）
 * 2. 中英文的佔位符集合必須一致——只改一邊等於另一邊繼續講錯話
 * 3. 元件真的把每個佔位符的值傳進去（next-intl 少傳會在 render 當下才爆）
 * 4. 確認信不得再出現「不是每人票」這種與計價相反的說法
 */

type Msg = Record<string, string>;
const zhOpen = (zh as unknown as { experiences: { openClass: Msg } }).experiences.openClass;
const enOpen = (en as unknown as { experiences: { openClass: Msg } }).experiences.openClass;

/** 取出 ICU 訊息裡的 `{name}` 佔位符名稱 */
function placeholders(msg: string): Set<string> {
  return new Set([...msg.matchAll(/\{(\w+)\}/g)].map(m => m[1]));
}

const COMPONENT = readFileSync(
  join(__dirname, "../../app/experiences/[slug]/OpenClassRequest.tsx"),
  "utf8",
);

/** `t("key", { … })` 這一段的引數字面值 */
function argsOf(key: string): string {
  const marker = `t("${key}", {`;
  const at = COMPONENT.indexOf(marker);
  expect(at, `元件裡找不到 t("${key}", { … })`).toBeGreaterThan(-1);
  const from = at + marker.length;
  return COMPONENT.slice(from, COMPONENT.indexOf("}", from));
}

describe("開課請求文案：金額規則要講完整", () => {
  it("中英文都寫出「超過門檻之後每多 1 人加多少」", () => {
    for (const [locale, msg] of [["zh", zhOpen.slotsNote], ["en", enOpen.slotsNote]] as const) {
      expect(placeholders(msg), `${locale} 的 slotsNote 少了單價`).toContain("price");
      expect(placeholders(msg)).toContain("slots");
      expect(placeholders(msg)).toContain("total");
    }
  });

  it("不得再出現「付最低金額就能帶更多人」的說法", () => {
    expect(zhOpen.slotsNote).not.toContain("不是每人票");
    expect(enOpen.slotsNote.toLowerCase()).not.toContain("per-person ticket");
  });

  it("送出前就看得到人數對應的金額（試算列與人數上限提示都在）", () => {
    expect(zhOpen.estimate).toBeTruthy();
    expect(enOpen.estimate).toBeTruthy();
    expect(zhOpen.overCapacity).toBeTruthy();
    expect(enOpen.overCapacity).toBeTruthy();
  });

  it("中英文的佔位符集合一致——只改一邊等於另一邊繼續講錯話", () => {
    for (const key of ["slotsNote", "estimate", "overCapacity"]) {
      expect([...placeholders(zhOpen[key])].sort(), `${key} 中英不一致`)
        .toEqual([...placeholders(enOpen[key])].sort());
    }
  });

  it("元件把每個佔位符的值都傳進去了", () => {
    for (const key of ["slotsNote", "estimate", "overCapacity"]) {
      const args = argsOf(key);
      for (const name of placeholders(zhOpen[key])) {
        expect(args.includes(name), `${key} 沒有傳 ${name}`).toBe(true);
      }
    }
  });
});

describe("確認信與頁面講同一套規則", () => {
  const EMAIL = readFileSync(join(__dirname, "../../lib/email.ts"), "utf8");

  it("信裡不得再說「不是每人票」", () => {
    expect(EMAIL).not.toContain("不是每人票");
    expect(EMAIL.toLowerCase()).not.toContain("per-person ticket");
  });

  it("信裡有講清楚名額怎麼算", () => {
    expect(EMAIL).toContain("人數少於開團最低名額仍收最低名額");
  });
});
