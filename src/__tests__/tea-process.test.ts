import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { products } from "@/data/products";
import {
  COMMON_CLOSING,
  COMMON_OPENING,
  getProductFor,
  resolveSteps,
  teaProcesses,
  type StepKey,
  type TeaKey,
} from "@/data/tea-process";

/**
 * 這組測試把 openspec/changes/tea-process-multi-tea/design.md 1.2 節的矩陣
 * 釘成可執行的斷言——製程資料是本頁的事實來源，寫錯不會有畫面異常，
 * 只會安靜地對客人講錯自家茶怎麼做。
 */

/** 讀取某語系 messages 檔的 process 子樹 */
function readMessages(locale: "zh" | "en"): Record<string, unknown> {
  const raw = readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf-8");
  return JSON.parse(raw).process as Record<string, unknown>;
}

/** 取某款茶「實際會做」的工序序列（不含 skipped） */
function actualSteps(key: TeaKey): StepKey[] {
  return resolveSteps(key)
    .filter((s) => s.state !== "skipped")
    .map((s) => s.step);
}

/** 取某款茶分歧段的顯示序列（含 skipped，用於驗證對比呈現） */
function divergenceDisplay(key: TeaKey) {
  return resolveSteps(key)
    .filter((s) => s.section === "divergence")
    .map((s) => `${s.step}:${s.state}`);
}

describe("茶款與商品的對應", () => {
  it("五款茶皆對應到實際上架商品", () => {
    expect(teaProcesses).toHaveLength(5);
    for (const tea of teaProcesses) {
      const product = getProductFor(tea.key);
      expect(product, `${tea.key} 找不到對應商品`).toBeDefined();
    }
  });

  it("商品目錄的每一款茶都有製程資料（無遺漏品項）", () => {
    const mapped = teaProcesses.map((t) => t.productId).sort();
    expect(mapped).toEqual(products.map((p) => p.id).sort());
  });

  it("四季春與紅烏龍標記為合作茶農，其餘為自家茶園", () => {
    const sourcing = Object.fromEntries(teaProcesses.map((t) => [t.key, t.sourcing]));
    expect(sourcing).toEqual({
      oolong: "own",
      jinxuan: "own",
      black: "own",
      sijichun: "partner",
      redOolong: "partner",
    });
  });
});

describe("核心洞察：炒菁的位置決定茶種", () => {
  it("烏龍三款的炒菁在分歧段最前", () => {
    for (const key of ["oolong", "jinxuan", "sijichun"] as const) {
      const divergence = resolveSteps(key).filter((s) => s.section === "divergence");
      expect(divergence[0]?.step, `${key} 的分歧段首步應為炒菁`).toBe("fix");
      expect(divergence[0]?.state).not.toBe("skipped");
    }
  });

  it("蜜香紅茶沒有炒菁", () => {
    const fix = resolveSteps("black").find((s) => s.step === "fix");
    expect(fix?.state).toBe("skipped");
    expect(actualSteps("black")).not.toContain("fix");
  });

  it("紅烏龍的炒菁在分歧段最後", () => {
    const divergence = resolveSteps("redOolong").filter((s) => s.section === "divergence");
    expect(divergence.at(-1)?.step).toBe("fix");
    expect(divergence.at(-1)?.state).not.toBe("skipped");
  });

  it("紅烏龍與蜜香紅茶的分歧段前兩步相同（揉捻→發酵）", () => {
    const black = actualSteps("black").filter((s) => ["roll", "ferment", "fix"].includes(s));
    const red = actualSteps("redOolong").filter((s) => ["roll", "ferment", "fix"].includes(s));

    expect(black).toEqual(["roll", "ferment"]);
    expect(red).toEqual(["roll", "ferment", "fix"]);
    // 紅烏龍走的是紅茶的路，只是最後多踩一腳煞車
    expect(red.slice(0, 2)).toEqual(black);
  });
});

describe("分歧段的顯示序列（design.md 1.2 矩陣）", () => {
  it("烏龍三款：炒菁 → 揉捻，並顯示跳過的發酵", () => {
    for (const key of ["oolong", "jinxuan", "sijichun"] as const) {
      expect(divergenceDisplay(key)).toEqual([
        "fix:common",
        "roll:common",
        "ferment:skipped",
      ]);
    }
  });

  it("蜜香紅茶：跳過的炒菁排在最前，接揉捻 → 發酵", () => {
    expect(divergenceDisplay("black")).toEqual([
      "fix:skipped",
      "roll:accent",
      "ferment:accent",
    ]);
  });

  it("紅烏龍：揉捻 → 發酵 → 炒菁", () => {
    expect(divergenceDisplay("redOolong")).toEqual([
      "roll:common",
      "ferment:accent",
      "fix:common",
    ]);
  });
});

describe("共通段", () => {
  it("五款茶的共通前段完全相同且無人跳步", () => {
    for (const tea of teaProcesses) {
      const opening = resolveSteps(tea.key).filter((s) => s.section === "opening");
      expect(opening.map((s) => s.step)).toEqual([...COMMON_OPENING]);
      expect(opening.every((s) => s.state !== "skipped"), `${tea.key} 前段不應有跳步`).toBe(true);
    }
  });

  it("五款茶的共通後段順序相同", () => {
    for (const tea of teaProcesses) {
      const closing = resolveSteps(tea.key).filter((s) => s.section === "closing");
      expect(closing.map((s) => s.step)).toEqual([...COMMON_CLOSING]);
    }
  });

  it("布球團揉為五款茶共通——連紅茶都做成球形", () => {
    for (const tea of teaProcesses) {
      const ballRoll = resolveSteps(tea.key).find((s) => s.step === "ballRoll");
      expect(ballRoll?.state, `${tea.key} 應有布球團揉`).not.toBe("skipped");
    }
  });

  it("揀枝併在乾燥步驟，包裝為焙火之後的最後一步", () => {
    const closing = [...COMMON_CLOSING];
    expect(closing.indexOf("dryFinal")).toBeLessThan(closing.indexOf("roast"));
    expect(closing.at(-1)).toBe("pack");
    expect(closing).not.toContain("sort");
  });
});

describe("焙火是條件性工序", () => {
  const roastStateOf = (key: TeaKey) => resolveSteps(key).find((s) => s.step === "roast")?.state;

  it("各茶款的焙火狀態符合店主實際配置", () => {
    expect(roastStateOf("oolong")).toBe("optional"); // 焙與不焙都有，網站預設淺焙
    expect(roastStateOf("jinxuan")).toBe("common"); // 淺焙
    expect(roastStateOf("sijichun")).toBe("skipped"); // 不焙，生茶直接賣
    expect(roastStateOf("black")).toBe("common"); // 淺焙
    expect(roastStateOf("redOolong")).toBe("accent"); // 重焙
  });

  it("焙火並非所有茶款共通", () => {
    const states = teaProcesses.map((t) => roastStateOf(t.key));
    expect(new Set(states).size).toBeGreaterThan(1);
  });
});

describe("步驟編號", () => {
  it("skipped 不佔編號，其餘連續編號", () => {
    for (const tea of teaProcesses) {
      const steps = resolveSteps(tea.key);
      expect(steps.filter((s) => s.state === "skipped").every((s) => s.number === null)).toBe(true);

      const numbers = steps.filter((s) => s.state !== "skipped").map((s) => s.number);
      expect(numbers).toEqual(numbers.map((_, i) => String(i + 1).padStart(2, "0")));
    }
  });

  it("optional 佔編號——它是真的會做的一步，只是視批次決定", () => {
    const roast = resolveSteps("oolong").find((s) => s.step === "roast");
    expect(roast?.state).toBe("optional");
    expect(roast?.number).not.toBeNull();
  });

  it("四季春因不焙火，總步數比高山烏龍少一步", () => {
    expect(actualSteps("sijichun")).toHaveLength(actualSteps("oolong").length - 1);
  });

  it("紅烏龍步數最多（分歧段三步）", () => {
    const counts = teaProcesses.map((t) => actualSteps(t.key).length);
    expect(Math.max(...counts)).toBe(actualSteps("redOolong").length);
  });
});

describe("擠壓不獨立成工序（設備不佔工序層級）", () => {
  it("步驟清單中不存在擠壓步驟", () => {
    for (const tea of teaProcesses) {
      const keys = resolveSteps(tea.key).map((s) => s.step as string);
      expect(keys).not.toContain("press");
      expect(keys).not.toContain("squeeze");
    }
  });
});

/**
 * i18n 對稱性：zh / en 的 process 子樹必須逐葉節點對齊。
 * 機械比對，不靠肉眼——漏翻一個 key 在畫面上只會顯示 key 名稱，
 * 而 EN 站的讀者不會回報，我們也不會發現。
 */
describe("i18n：process 文案兩語系對稱", () => {
  type Json = { [k: string]: unknown };

  /** 遞迴展開成 "a.b.c" 葉節點路徑集合 */
  function leafPaths(obj: unknown, prefix = ""): string[] {
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      return [prefix];
    }
    return Object.entries(obj as Json).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }

  const zh = readMessages("zh");
  const en = readMessages("en");

  it("zh 與 en 的 process 葉節點集合完全相同", () => {
    const zhPaths = new Set(leafPaths(zh));
    const enPaths = new Set(leafPaths(en));

    const missingInEn = [...zhPaths].filter((p) => !enPaths.has(p)).sort();
    const missingInZh = [...enPaths].filter((p) => !zhPaths.has(p)).sort();

    expect({ missingInEn, missingInZh }).toEqual({
      missingInEn: [],
      missingInZh: [],
    });
  });

  it("每個共通工序都有 name / desc / detail 三個欄位", () => {
    for (const locale of [zh, en]) {
      const steps = locale.steps as Record<string, Json>;
      for (const key of [...COMMON_OPENING, "fix", "roll", "ferment", ...COMMON_CLOSING]) {
        expect(Object.keys(steps[key] ?? {}).sort()).toEqual([
          "desc",
          "detail",
          "name",
        ]);
      }
    }
  });

  it("資料層用到的每個 step key 都有對應文案", () => {
    for (const locale of [zh, en]) {
      const steps = locale.steps as Record<string, unknown>;
      for (const tea of teaProcesses) {
        for (const { step } of resolveSteps(tea.key)) {
          expect(steps[step]).toBeDefined();
        }
      }
    }
  });

  it("每個 skipped 工序都有 skipReason，不得靜默跳過", () => {
    for (const locale of [zh, en]) {
      const teaSteps = locale.teaSteps as Record<string, Record<string, Json>>;
      for (const tea of teaProcesses) {
        for (const { step, state } of resolveSteps(tea.key)) {
          if (state !== "skipped") continue;
          expect(teaSteps[tea.key]?.[step]?.skipReason).toBeTruthy();
        }
      }
    }
  });

  it("每個 accent / optional 工序都有專屬 desc", () => {
    for (const locale of [zh, en]) {
      const teaSteps = locale.teaSteps as Record<string, Record<string, Json>>;
      for (const tea of teaProcesses) {
        for (const { step, state } of resolveSteps(tea.key)) {
          if (state !== "accent" && state !== "optional") continue;
          expect(teaSteps[tea.key]?.[step]?.desc).toBeTruthy();
        }
      }
    }
  });

  it("每款茶都有製法家族與工藝取捨文案", () => {
    for (const locale of [zh, en]) {
      const families = locale.families as Record<string, unknown>;
      const craftNote = locale.craftNote as Record<string, unknown>;
      for (const tea of teaProcesses) {
        expect(families[tea.family]).toBeDefined();
        expect(craftNote[tea.key]).toBeTruthy();
      }
    }
  });

  /**
   * 決策 ① 方案 B 的範圍**只限新增工序**——spec.md「製程參數不得虛構」明文：
   * 「現有烏龍流程既有的參數（steps.*.detail 中的溫度與時間）SHALL 保留
   * ——那些是已確認的自家做法」，並另立 Scenario「既有參數保留」。
   *
   * 這裡曾經寫反過（斷言全部工序都不得有溫度時數），把違反規格的行為釘成正確行為，
   * 導致既有已確認參數被整批刪掉還測試全綠。兩個方向都要釘，才不會再錯任一邊。
   */
  // 需涵蓋小數（1.5小時）與「次」這類單位（2-4次），不能只認「數字-數字+單位」
  const PARAM_PATTERN = /\d\s*(°C|℃)|[\d.]+\s*(小時|分鐘|次|hours?|minutes?|sessions?)/i;

  /** 改版前既有、且原本就帶參數的工序——這些必須留著 */
  const STEPS_WITH_LEGACY_PARAMS = ["witherSun", "witherIndoor", "shake", "fix", "roll", "roast"] as const;

  /** 本次新增的工序——這些不得出現任何數值 */
  const NEW_STEPS = ["ferment", "dryFirst", "ballRoll", "dryFinal", "pack"] as const;

  it("既有工序的溫度與時間參數必須保留（spec: 既有參數保留）", () => {
    for (const locale of [zh, en]) {
      const steps = locale.steps as Record<string, Record<string, string>>;
      for (const key of STEPS_WITH_LEGACY_PARAMS) {
        expect(steps[key].detail).toMatch(PARAM_PATTERN);
      }
    }
  });

  it("新增工序不得出現溫度或時數（spec: 新增工序不出現數字）", () => {
    for (const locale of [zh, en]) {
      const steps = locale.steps as Record<string, Record<string, string>>;
      for (const key of NEW_STEPS) {
        expect(`${key}:${steps[key].desc} ${steps[key].detail}`).not.toMatch(PARAM_PATTERN);
      }
    }
  });

  it("每個工序的 detail 都要有可觀察的判斷依據，不得只有含糊語句", () => {
    // spec：「發酵至適當程度」「充分乾燥」等無可觀察內容的句子 SHALL NOT 通過驗收
    const vague = /(發酵|乾燥|萎凋|焙火)至?(適當|充分|足夠)/;
    const zhSteps = zh.steps as Record<string, Record<string, string>>;
    for (const [key, copy] of Object.entries(zhSteps)) {
      expect(`${key}:${copy.detail}`).not.toMatch(vague);
      // 每一步都要講出「怎麼判斷完成」——採摘與包裝以季節／品質標示交代，其餘須有判斷依據
      if (key !== "pick" && key !== "pack") {
        expect(`${key}:${copy.detail}`).toMatch(/判斷依據/);
      }
    }
  });

  it("揀枝文案不得宣稱手工——實情是粗選機與鼓風機", () => {
    // 這是既有線上文案的不實工藝宣稱，改寫後不得復發（design.md 1.2.3）
    const zhFinal = (zh.steps as Record<string, Record<string, string>>).dryFinal;
    expect(`${zhFinal.desc}${zhFinal.detail}`).not.toMatch(/手工揀|逐一手工/);
    expect(`${zhFinal.desc}${zhFinal.detail}`).toMatch(/粗選機/);
    expect(`${zhFinal.desc}${zhFinal.detail}`).toMatch(/鼓風機/);
  });
});

/**
 * 店主校對後的事實更正（2026-07-30，tasks 0.10）。
 * 這些是規劃者推論錯、店主逐條更正的內容——寫錯不會有畫面異常，
 * 只會安靜地對客人講錯自家茶怎麼做，其中農藥那則還帶合規風險。
 */
describe("店主校對過的工藝取捨事實", () => {
  const zh = readMessages("zh");
  const en = readMessages("en");

  const craft = (loc: Record<string, unknown>) =>
    loc.craftNote as Record<string, string>;
  const teaStep = (loc: Record<string, unknown>, tea: string, step: string) =>
    (loc.teaSteps as Record<string, Record<string, Record<string, string>>>)[tea][step];

  it("不得宣稱不用藥——實情是仍防治小綠葉蟬以外的病蟲害", () => {
    // 這是對外的農藥宣稱，初稿寫「要蜜香就不能用藥」為誤。合規風險高，不得復發。
    const banned = /不能用藥|不用藥|未使用農藥|無農藥|no pesticides?|pesticide[- ]free|without pesticides?/i;
    for (const locale of [zh, en]) {
      expect(craft(locale).black).not.toMatch(banned);
      expect(teaStep(locale, "black", "pick").desc).not.toMatch(banned);
    }
  });

  it("蜜香紅茶文案須說明小綠葉蟬是必要條件，且其他病蟲害照常防治", () => {
    expect(craft(zh).black).toMatch(/小綠葉蟬/);
    expect(craft(zh).black).toMatch(/其他病蟲害/);
    expect(teaStep(zh, "black", "pick").desc).toMatch(/其他病蟲害/);
  });

  it("金萱：轉成奶油味的是中焙，不是淺焙", () => {
    // 2026-07-30 店主二次更正。三階段：淺焙＝奶香保留／中焙＝轉奶油味／重焙＝被蓋過
    const jinxuan = craft(zh).jinxuan;
    expect(jinxuan).toMatch(/中焙/);
    expect(jinxuan).toMatch(/淺焙不會讓奶香消失/);
    // 不得回退成「淺焙…轉成…奶油」的說法
    expect(jinxuan).not.toMatch(/淺焙[^。]*轉成[^。]*奶油/);
    expect(craft(en).jinxuan).toMatch(/medium roast/i);
  });

  it("高山烏龍：須強調技術帶來穩定，不得寫成逐年做法不同", () => {
    const oolong = craft(zh).oolong;
    expect(oolong).toMatch(/製茶技術/);
    expect(oolong).toMatch(/穩定/);
    // 原文「今年跟去年的做法未必一樣」讀起來像品質不穩，不得復發
    expect(oolong).not.toMatch(/做法未必一樣|不是照表操課/);
  });

  it("四季春：價格親民的主因是機採，不得只寫一年多採", () => {
    const siji = craft(zh).sijichun;
    expect(siji).toMatch(/機採/);
    expect(siji).toMatch(/一年可採多次/);
    expect(craft(en).sijichun).toMatch(/machine harvest/i);
  });

  it("紅烏龍：鹿野為發源地（經店主確認）", () => {
    expect(craft(zh).redOolong).toMatch(/鹿野/);
    expect(craft(zh).redOolong).toMatch(/發源地/);
  });
});

/**
 * 共通段的不變量（spec 於 2026-07-30 經店主裁決改為「步驟組成不變」）。
 * 原措辭是「卡片內容不變」，與同一份規格的焙火要求矛盾——roast 屬共通後段卻
 * 必須因茶而異。改後的規則要同時釘住兩件事：組成不可變、狀態可以變。
 */
describe("共通段不變量：步驟組成不變，但允許該茶專屬狀態", () => {
  it("五款茶的共通前後段步驟集合與順序完全一致", () => {
    for (const tea of teaProcesses) {
      const steps = resolveSteps(tea.key);
      expect(steps.filter((s) => s.section === "opening").map((s) => s.step)).toEqual([
        ...COMMON_OPENING,
      ]);
      expect(steps.filter((s) => s.section === "closing").map((s) => s.step)).toEqual([
        ...COMMON_CLOSING,
      ]);
    }
  });

  it("共通段確實存在該茶專屬狀態——這是規格允許的，不得被抹平", () => {
    const nonCommonInShared = teaProcesses.flatMap((tea) =>
      resolveSteps(tea.key)
        .filter((s) => s.section !== "divergence" && s.state !== "common")
        .map((s) => `${tea.key}.${s.step}:${s.state}`),
    );
    // 店主校對確認的四處：紅茶著蜒、四季春機採、紅烏龍長時萎凋與重攪拌、焙火三態
    expect(nonCommonInShared).toEqual(
      expect.arrayContaining([
        "oolong.roast:optional",
        "sijichun.pick:accent",
        "sijichun.roast:skipped",
        "black.pick:accent",
        "redOolong.witherIndoor:accent",
        "redOolong.shake:accent",
        "redOolong.roast:accent",
      ]),
    );
  });

  it("共通前段不得有任何茶款跳步（skipped 只出現在分歧段與焙火）", () => {
    for (const tea of teaProcesses) {
      const opening = resolveSteps(tea.key).filter((s) => s.section === "opening");
      expect(opening.every((s) => s.state !== "skipped"), `${tea.key} 前段不應有跳步`).toBe(true);
    }
    const skippedSteps = new Set(
      teaProcesses.flatMap((t) =>
        resolveSteps(t.key).filter((s) => s.state === "skipped").map((s) => s.step),
      ),
    );
    expect([...skippedSteps].sort()).toEqual(["ferment", "fix", "roast"]);
  });
});

describe("四季春為機採（店主確認，2026-07-30）", () => {
  const zh = readMessages("zh");
  const en = readMessages("en");

  it("四季春的採摘標為 accent——共通段的手採說法對它不成立", () => {
    const pick = resolveSteps("sijichun").find((s) => s.step === "pick");
    expect(pick?.state).toBe("accent");
    // 其餘四款仍走共通採摘文案；蜜香紅茶因著蜒另為 accent
    expect(resolveSteps("oolong").find((s) => s.step === "pick")?.state).toBe("common");
    expect(resolveSteps("jinxuan").find((s) => s.step === "pick")?.state).toBe("common");
    expect(resolveSteps("redOolong").find((s) => s.step === "pick")?.state).toBe("common");
  });

  it("四季春採摘文案須說明機採與成本結構", () => {
    const pickZh = (zh.teaSteps as Record<string, Record<string, Record<string, string>>>)
      .sijichun.pick;
    expect(pickZh.desc).toMatch(/機採/);
    expect(pickZh.desc).toMatch(/不是手工一心二葉/);
    expect(pickZh.detail).toMatch(/機採/);
    const pickEn = (en.teaSteps as Record<string, Record<string, Record<string, string>>>)
      .sijichun.pick;
    expect(pickEn.desc).toMatch(/machine harvest/i);
  });
});

/**
 * 高山烏龍的焙火在製程上確實是 optional（焙與不焙都做），但**網站販售一律淺焙**，
 * 生茶只在門市或詢問時提供（2026-07-30 店主確認）。
 *
 * 這是對客人的販售條件宣稱：寫成「預設」或「偶有生茶」會讓人以為線上可能拿到
 * 生茶、甚至以為可以選，與實情不符。與農藥那則同性質，故一併釘住。
 */
describe("高山烏龍焙火：製程可選，但網站販售一律淺焙", () => {
  const zh = readMessages("zh");
  const en = readMessages("en");
  const roastOf = (loc: Record<string, unknown>) =>
    (loc.teaSteps as Record<string, Record<string, Record<string, string>>>).oolong.roast;

  it("製程狀態仍為 optional——焙與不焙都做是事實，不因販售政策而改", () => {
    expect(resolveSteps("oolong").find((s) => s.step === "roast")?.state).toBe("optional");
  });

  it("文案須明講網站販售一律淺焙", () => {
    const { desc, detail } = roastOf(zh);
    expect(`${desc}${detail}`).toMatch(/網站/);
    expect(desc).toMatch(/一律|都是/);
    expect(en.teaSteps as object).toBeDefined();
    expect(`${roastOf(en).desc}${roastOf(en).detail}`).toMatch(/online/i);
  });

  it("不得寫成「預設」或「偶有生茶」——會讓人以為線上可能拿到生茶或可以選", () => {
    const { desc, detail } = roastOf(zh);
    expect(`${desc}${detail}`).not.toMatch(/預設/);
    expect(`${desc}${detail}`).not.toMatch(/偶有生茶/);
    // 對照表欄位同樣不得暗示線上可選
    const matrix = (zh.teas as Record<string, Record<string, string>>).oolong.roast;
    expect(matrix).not.toMatch(/預設|偶有/);
    expect(matrix).toMatch(/網站/);
  });

  it("不得暗示客人可以在網站上選焙度", () => {
    const { detail } = roastOf(zh);
    // 原文「選配：…以及客人要什麼」會讓人以為線上可選
    expect(detail).not.toMatch(/客人要什麼/);
  });
});

/**
 * 共通焙火文案保留「因應客人偏好客製」的敘事（店主原話、工藝現實），
 * 但必須同時講明管道——網站品項是固定焙度，客製要走門市或來訊。
 * 少了後半句，金萱與蜜香紅茶的讀者會以為線上下單能指定焙度。
 */
describe("共通焙火文案：保留客製敘事，但講明管道", () => {
  const zh = readMessages("zh");
  const en = readMessages("en");
  const roastDesc = (loc: Record<string, unknown>) =>
    (loc.steps as Record<string, Record<string, string>>).roast.desc;

  it("保留「因應客人偏好」的客製敘事", () => {
    expect(roastDesc(zh)).toMatch(/客人偏好/);
  });

  it("同時講明網站品項為固定焙度、客製走門市或來訊", () => {
    expect(roastDesc(zh)).toMatch(/固定焙度/);
    expect(roastDesc(zh)).toMatch(/門市|洽詢/);
    expect(roastDesc(en)).toMatch(/set roast level/i);
    expect(roastDesc(en)).toMatch(/shop or by message/i);
  });
});
