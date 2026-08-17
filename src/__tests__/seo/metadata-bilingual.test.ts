import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import zh from "../../../messages/zh.json";
import en from "../../../messages/en.json";

// metadata 雙語齊備的守衛。
//
// 背景（2026-08-17）：英文頁的頁面本體早就翻譯好了，但 title／description 是寫死在
// 各頁 metadata 裡的中文字串——`/en/about` 的標題是「關於我們 | 霧抉茶」。文案搬進
// messages/ 之後，最容易復發的兩種錯是「只加了 zh 忘了 en」與「en 區塊裡貼了中文」，
// 兩者都不會讓建置失敗，只會安靜地上線。

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Messages = Record<string, any>;

const CJK = /[㐀-䶿一-鿿　-〿＀-￯]/;

function metaBlocks(msgs: Messages): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (msgs.siteMeta) out.siteMeta = msgs.siteMeta;
  for (const [ns, val] of Object.entries(msgs)) {
    if (val && typeof val === "object" && "meta" in val) out[`${ns}.meta`] = val.meta;
  }
  return out;
}

const zhMeta = metaBlocks(zh as Messages);
const enMeta = metaBlocks(en as Messages);

// 把 meta 區塊攤平成 [路徑, 值] 供逐項檢查
function flatten(prefix: string, val: unknown, out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof val === "string") out.push([prefix, val]);
  else if (Array.isArray(val)) val.forEach((v, i) => flatten(`${prefix}[${i}]`, v, out));
  else if (val && typeof val === "object") {
    for (const [k, v] of Object.entries(val)) flatten(`${prefix}.${k}`, v, out);
  }
  return out;
}

describe("messages 的 meta 區塊 zh／en 必須成對", () => {
  it("掃到的 meta 區塊數量合理（防呆：選取邏輯壞掉會掃到 0 個而假性通過）", () => {
    expect(Object.keys(zhMeta).length).toBeGreaterThanOrEqual(10);
  });

  it("zh 有的 meta 區塊，en 也要有", () => {
    expect(Object.keys(enMeta).sort()).toEqual(Object.keys(zhMeta).sort());
  });

  for (const block of Object.keys(zhMeta)) {
    it(`${block} 的 key 兩邊一致`, () => {
      const zhKeys = Object.keys(zhMeta[block] as object).sort();
      const enKeys = Object.keys(enMeta[block] as object).sort();
      expect(enKeys, `${block} 的 key 不一致`).toEqual(zhKeys);
    });
  }
});

describe("en 的 meta 不得殘留中文", () => {
  for (const block of Object.keys(enMeta)) {
    it(`${block} 全為英文`, () => {
      const offenders = flatten(block, enMeta[block])
        .filter(([, v]) => CJK.test(v))
        .map(([k, v]) => `${k} = ${v}`);
      expect(offenders, `以下英文 metadata 含中日韓字元：\n${offenders.join("\n")}`).toEqual([]);
    });
  }

  it("每個 title 與 description 都非空", () => {
    for (const [block, val] of Object.entries(enMeta)) {
      const m = val as Record<string, string>;
      for (const key of ["title", "description", "defaultTitle"]) {
        if (key in m) expect(m[key].trim().length, `${block}.${key} 是空的`).toBeGreaterThan(0);
      }
    }
  });
});

describe("zh 的 meta 確實是中文（防止兩邊被貼反）", () => {
  for (const block of Object.keys(zhMeta)) {
    it(`${block} 的 title／description 含中文`, () => {
      const m = zhMeta[block] as Record<string, unknown>;
      const probe = [m.title, m.description, m.defaultTitle].filter(v => typeof v === "string") as string[];
      expect(probe.length).toBeGreaterThan(0);
      // webDesign 的品牌名「風土數位」等都含中文；純英文品牌名不在 title/description 裡
      expect(probe.some(v => CJK.test(v)), `${block} 的 title/description 沒有中文，可能貼反了`).toBe(true);
    });
  }
});

describe("title.template 的品牌名兩邊各自成立", () => {
  it("zh 用中文品牌、en 用英文品牌，且都含 %s", () => {
    const z = (zh as Messages).siteMeta;
    const e = (en as Messages).siteMeta;
    expect(z.titleTemplate).toContain("%s");
    expect(e.titleTemplate).toContain("%s");
    expect(CJK.test(z.brand)).toBe(true);
    expect(CJK.test(e.brand)).toBe(false);
  });

  it("og:locale 兩邊不同且格式正確", () => {
    expect((zh as Messages).siteMeta.ogLocale).toBe("zh_TW");
    expect((en as Messages).siteMeta.ogLocale).toBe("en_US");
  });
});

describe("/alishan-tea 的 metadata 留在頁面內，也要雙語齊備", () => {
  // 這頁的長文刻意不進 messages/（見該檔 CONTENT 上方註解），metadata 跟著留在檔內。
  // 因此上面針對 messages 的檢查掃不到它，這裡改用靜態掃描補上。
  const src = readFileSync(join(process.cwd(), "src", "app", "alishan-tea", "page.tsx"), "utf8");

  it("zh 與 en 兩個區塊都有 meta", () => {
    const zhIdx = src.indexOf("  zh: {");
    const enIdx = src.indexOf("  en: {");
    expect(zhIdx, "找不到 zh 區塊，測試已腐爛").toBeGreaterThan(-1);
    expect(enIdx).toBeGreaterThan(zhIdx);

    const zhBlock = src.slice(zhIdx, enIdx);
    const enBlock = src.slice(enIdx);
    expect(zhBlock).toContain("meta: {");
    expect(enBlock).toContain("meta: {");
  });

  it("generateMetadata 依 locale 取用，而不是寫死其中一種", () => {
    expect(src).toMatch(/CONTENT\[locale === "en" \? "en" : "zh"\]\.meta/);
  });
});
