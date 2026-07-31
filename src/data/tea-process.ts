import { products } from "@/data/products";

/**
 * 製茶過程頁的結構資料。
 *
 * 核心模型（見 openspec/changes/tea-process-multi-tea/design.md）：
 * 五款茶的製程「共通前段相同、共通後段相同，只有中間分歧段各走各的」，
 * 而分歧段的差異可收斂成一件事——炒菁擺在哪裡：
 *   炒菁在最前 → 烏龍（氧化未起即暫停）
 *   沒有炒菁   → 紅茶（氧化一路到底）
 *   炒菁在最後 → 紅烏龍（氧化跑一段再踩煞車）
 *
 * 本檔只存結構與關聯，所有使用者可見文字走 i18n（messages/*.json 的 process）。
 */

export type TeaKey = "oolong" | "jinxuan" | "sijichun" | "black" | "redOolong";

export type FamilyKey = "partialBall" | "fullBall" | "heavyBall";

export type StepKey =
  // 共通前段（茶廠．第一天）
  | "pick"
  | "witherSun"
  | "witherIndoor"
  | "shake"
  // 分歧段
  | "fix"
  | "roll"
  | "ferment"
  // 共通後段（茶廠 → 家）
  | "dryFirst"
  | "ballRoll"
  | "dryFinal"
  | "roast"
  | "pack";

/**
 * common   此茶有這一步，用共通文案
 * accent   此茶在這一步有專屬做法，顯示專屬文案並視覺強調
 * skipped  此茶沒有這一步，卡片保留但降階顯示，必須說明原因
 * optional 視批次與客人偏好決定，卡片正常顯示但加註判斷依據
 */
export type StepState = "common" | "accent" | "skipped" | "optional";

/** 茶葉來源：自家茶園或合作茶農 */
export type Sourcing = "own" | "partner";

/** 共通前段：五款茶完全相同 */
export const COMMON_OPENING: readonly StepKey[] = [
  "pick",
  "witherSun",
  "witherIndoor",
  "shake",
] as const;

/** 共通後段：五款茶順序相同，惟 roast 的狀態因茶而異（見各茶的 overrides） */
export const COMMON_CLOSING: readonly StepKey[] = [
  "dryFirst",
  "ballRoll",
  "dryFinal",
  "roast",
  "pack",
] as const;

/** 分歧段的一格：步驟本身 + 此茶在這一格的狀態 */
export interface DivergenceStep {
  step: StepKey;
  state: StepState;
}

export interface TeaProcess {
  key: TeaKey;
  family: FamilyKey;
  /** 對應 src/data/products.ts 的商品 id，供「買這款茶」CTA 導流 */
  productId: number;
  sourcing: Sourcing;
  /**
   * 分歧段的實際順序。skipped 的格子也列在此處並排在它「本來會出現」的位置，
   * 例如蜜香紅茶把 fix 標為 skipped 排在最前，好讓使用者看見烏龍在這裡炒菁、紅茶沒有。
   */
  divergence: readonly DivergenceStep[];
  /** 覆寫共通段的預設狀態（未列出者一律 common） */
  overrides: Partial<Record<StepKey, StepState>>;
}

export const teaProcesses: readonly TeaProcess[] = [
  {
    key: "oolong",
    family: "partialBall",
    productId: 1,
    sourcing: "own",
    divergence: [
      { step: "fix", state: "common" },
      { step: "roll", state: "common" },
      { step: "ferment", state: "skipped" },
    ],
    // 焙與不焙都有，網站販售預設淺焙，唯生茶特別出色的批次才不焙
    overrides: { roast: "optional" },
  },
  {
    key: "jinxuan",
    family: "partialBall",
    productId: 3,
    sourcing: "own",
    divergence: [
      { step: "fix", state: "common" },
      { step: "roll", state: "common" },
      { step: "ferment", state: "skipped" },
    ],
    // 淺焙：奶香會轉為奶油香而非消失，重焙才會被焙火味蓋掉
    overrides: {},
  },
  {
    key: "sijichun",
    family: "partialBall",
    productId: 5,
    sourcing: "partner",
    divergence: [
      { step: "fix", state: "common" },
      { step: "roll", state: "common" },
      { step: "ferment", state: "skipped" },
    ],
    // pick 為 accent：四季春是機採，共通段那套「手工挑一心三葉到一心四葉」的說法對它不成立
    overrides: { pick: "accent", roast: "skipped" },
  },
  {
    key: "black",
    family: "fullBall",
    productId: 2,
    sourcing: "own",
    divergence: [
      { step: "fix", state: "skipped" },
      { step: "roll", state: "accent" },
      { step: "ferment", state: "accent" },
    ],
    overrides: { pick: "accent" },
  },
  {
    key: "redOolong",
    family: "heavyBall",
    productId: 4,
    sourcing: "partner",
    // 前兩步與蜜香紅茶完全相同，末端多一道炒菁——這是它與紅茶的分水嶺
    // roll 為 accent：共通段的揉捻文案寫的是「炒菁後趁熱揉」，紅烏龍炒菁在最後，
    // 走的是紅茶那套先揉捻破壁再重發酵，套共通文案會講錯順序
    divergence: [
      { step: "roll", state: "accent" },
      { step: "ferment", state: "accent" },
      { step: "fix", state: "common" },
    ],
    overrides: { witherIndoor: "accent", shake: "accent", roast: "accent" },
  },
] as const;

export const familyOf: Record<TeaKey, FamilyKey> = Object.fromEntries(
  teaProcesses.map((t) => [t.key, t.family]),
) as Record<TeaKey, FamilyKey>;

export function getTeaProcess(key: TeaKey): TeaProcess {
  const tea = teaProcesses.find((t) => t.key === key);
  if (!tea) throw new Error(`Unknown tea key: ${key}`);
  return tea;
}

/** 該茶對應的商品（供 CTA 取名稱與價格） */
export function getProductFor(key: TeaKey) {
  const { productId } = getTeaProcess(key);
  return products.find((p) => p.id === productId);
}

/** 頁面渲染用：一格工序 */
export interface ResolvedStep {
  step: StepKey;
  state: StepState;
  /** 三段之中的哪一段，供分歧段套用不同視覺容器 */
  section: "opening" | "divergence" | "closing";
  /**
   * 顯示編號（01、02…）。skipped 不佔編號，故為 null；
   * optional 會佔編號——它是真的會做的一步，只是視批次決定。
   */
  number: string | null;
}

/**
 * 組出某款茶的完整工序序列，並依「非 skipped 才給號」的規則編號。
 *
 * 編號刻意採各茶自身的順序（01..N）而非跨茶款固定槽位——分歧段的順序本就因茶而異
 * （烏龍炒菁在最前、紅烏龍炒菁在最後），固定槽位會扭曲事實。
 */
export function resolveSteps(key: TeaKey): ResolvedStep[] {
  const tea = getTeaProcess(key);

  const sections: ResolvedStep[] = [
    ...COMMON_OPENING.map((step) => ({
      step,
      state: tea.overrides[step] ?? ("common" as StepState),
      section: "opening" as const,
      number: null,
    })),
    ...tea.divergence.map((d) => ({
      step: d.step,
      state: d.state,
      section: "divergence" as const,
      number: null,
    })),
    ...COMMON_CLOSING.map((step) => ({
      step,
      state: tea.overrides[step] ?? ("common" as StepState),
      section: "closing" as const,
      number: null,
    })),
  ];

  let n = 0;
  return sections.map((s) => ({
    ...s,
    number: s.state === "skipped" ? null : String(++n).padStart(2, "0"),
  }));
}
