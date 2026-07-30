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
