import { describe, it, expect } from "vitest";

import {
  type AvailabilityWindow,
  type Sortable,
  currentWindow,
  daysBetween,
  daysLeftInSeason,
  hasSeason,
  isInSeason,
  isPinned,
  nextWindow,
  seasonState,
  sortByManualOrder,
  sortExperiences,
  taipeiToday,
} from "@/lib/experience-ordering";

/**
 * 把 openspec/changes/experience-seasonal-ordering/specs 的場景釘成可執行的斷言。
 *
 * 最重要的是最後一組「回歸」：上線當天所有新欄位都是預設值，前台順序**必須
 * 跟現在完全一樣**。那條紅了就代表業主一執行 SQL、還沒填任何季節，列表順序
 * 就會變動——那是不能接受的。
 */

// 業主確認的萬鷺朝鳳鳥況期
const EGRET: AvailabilityWindow[] = [{ startDate: "2026-08-18", endDate: "2026-10-11" }];
// 採茶的兩段可採期
const PICKING: AvailabilityWindow[] = [
  { startDate: "2026-03-25", endDate: "2026-07-31" },
  { startDate: "2026-09-15", endDate: "2026-11-30" },
];

const exp = (id: number, over: Partial<Sortable> = {}): Sortable => ({ id, ...over });

describe("taipeiToday — 台灣時間，不是 UTC", () => {
  it("台灣時間季節首日 07:00（UTC 還在前一天）算首日", () => {
    // 2026-08-18 07:00 台北 === 2026-08-17 23:00Z
    expect(taipeiToday(new Date("2026-08-17T23:00:00Z"))).toBe("2026-08-18");
  });

  it("台灣時間午夜剛過就換日", () => {
    expect(taipeiToday(new Date("2026-08-17T16:00:00Z"))).toBe("2026-08-18");
    expect(taipeiToday(new Date("2026-08-17T15:59:00Z"))).toBe("2026-08-17");
  });

  it("輸出永遠是零填補的 YYYY-MM-DD", () => {
    expect(taipeiToday(new Date("2026-01-05T04:00:00Z"))).toBe("2026-01-05");
  });
});

describe("daysBetween", () => {
  it("跨月正確", () => {
    expect(daysBetween("2026-08-21", "2026-10-11")).toBe(51);
  });
  it("同一天是 0", () => {
    expect(daysBetween("2026-10-11", "2026-10-11")).toBe(0);
  });
  it("反向是負數", () => {
    expect(daysBetween("2026-10-12", "2026-10-11")).toBe(-1);
  });
});

describe("季節判定的邊界", () => {
  it("首日算季節中", () => {
    expect(isInSeason(EGRET, "2026-08-18")).toBe(true);
  });

  it("首日前一天不算", () => {
    expect(isInSeason(EGRET, "2026-08-17")).toBe(false);
  });

  it("末日算季節中，剩餘 0 天而非負數", () => {
    expect(isInSeason(EGRET, "2026-10-11")).toBe(true);
    expect(daysLeftInSeason(EGRET, "2026-10-11")).toBe(0);
  });

  it("末日隔天退出季節", () => {
    expect(isInSeason(EGRET, "2026-10-12")).toBe(false);
    expect(daysLeftInSeason(EGRET, "2026-10-12")).toBeNull();
  });

  it("多段區間各自成立，段與段之間的空窗不算季節中", () => {
    expect(isInSeason(PICKING, "2026-05-01")).toBe(true);   // 春夏段
    expect(isInSeason(PICKING, "2026-08-15")).toBe(false);  // 兩段之間
    expect(isInSeason(PICKING, "2026-10-01")).toBe(true);   // 秋冬段
    expect(currentWindow(PICKING, "2026-10-01")?.startDate).toBe("2026-09-15");
  });

  it("沒設定季節的體驗：不是季節中，也不是季節外", () => {
    expect(hasSeason(undefined)).toBe(false);
    expect(hasSeason([])).toBe(false);
    expect(isInSeason(undefined, "2026-08-21")).toBe(false);
    expect(seasonState(undefined, "2026-08-21")).toEqual({ kind: "none" });
  });
});

describe("nextWindow / seasonState", () => {
  it("季節中回 in-season 與倒數", () => {
    expect(seasonState(EGRET, "2026-08-21")).toEqual({
      kind: "in-season", endsOn: "2026-10-11", daysLeft: 51,
    });
  });

  it("季節還沒開始回 upcoming", () => {
    expect(seasonState(EGRET, "2026-08-01")).toEqual({ kind: "upcoming", startsOn: "2026-08-18" });
  });

  it("兩段之間回 upcoming，指向下一段而不是已過去那段", () => {
    expect(nextWindow(PICKING, "2026-08-15")?.startDate).toBe("2026-09-15");
    expect(seasonState(PICKING, "2026-08-15")).toEqual({ kind: "upcoming", startsOn: "2026-09-15" });
  });

  it("今年全部結束、明年還沒填 → ended（卡片顯示明年見，不是消失）", () => {
    expect(nextWindow(EGRET, "2026-12-01")).toBeNull();
    expect(seasonState(EGRET, "2026-12-01")).toEqual({ kind: "ended" });
  });
});

describe("釘選", () => {
  it("到期日當天仍算釘選", () => {
    expect(isPinned("2026-08-21", "2026-08-21")).toBe(true);
  });
  it("到期日隔天自動放開", () => {
    expect(isPinned("2026-08-21", "2026-08-22")).toBe(false);
  });
  it("沒設定就不是釘選", () => {
    expect(isPinned(null, "2026-08-21")).toBe(false);
    expect(isPinned(undefined, "2026-08-21")).toBe(false);
  });
});

describe("sortExperiences", () => {
  const today = "2026-09-01";

  it("季節中的自動置頂", () => {
    const list = [
      exp(1, { sortOrder: 10 }),
      exp(6, { sortOrder: 100, windows: EGRET }),
      exp(2, { sortOrder: 20 }),
    ];
    expect(sortExperiences(list, today).map(e => e.id)).toEqual([6, 1, 2]);
  });

  it("釘選壓過季節", () => {
    const list = [
      exp(6, { windows: EGRET }),
      exp(3, { pinnedUntil: "2026-09-30" }),
      exp(1, {}),
    ];
    expect(sortExperiences(list, today).map(e => e.id)).toEqual([3, 6, 1]);
  });

  it("釘選過期後不再優先", () => {
    const list = [
      exp(6, { windows: EGRET }),
      exp(3, { pinnedUntil: "2026-08-31" }),   // 昨天到期
    ];
    expect(sortExperiences(list, today).map(e => e.id)).toEqual([6, 3]);
  });

  it("季節結束後自動退回，不需要任何人操作", () => {
    const list = [exp(1, { sortOrder: 10 }), exp(6, { sortOrder: 100, windows: EGRET })];
    expect(sortExperiences(list, "2026-10-11").map(e => e.id)).toEqual([6, 1]); // 末日還在最前
    expect(sortExperiences(list, "2026-10-12").map(e => e.id)).toEqual([1, 6]); // 隔天退回
  });

  it("其他條件相同時依 id，且多次排序結果一致", () => {
    const list = [exp(5, { sortOrder: 50 }), exp(2, { sortOrder: 50 }), exp(9, { sortOrder: 50 })];
    expect(sortExperiences(list, today).map(e => e.id)).toEqual([2, 5, 9]);
    expect(sortExperiences(sortExperiences(list, today), today).map(e => e.id)).toEqual([2, 5, 9]);
  });

  it("不改動傳入的陣列", () => {
    const list = [exp(3), exp(1)];
    const before = list.map(e => e.id);
    sortExperiences(list, today);
    expect(list.map(e => e.id)).toEqual(before);
  });

  // ── 手動順序必須跟前台順序分開（2026-08-21 的實際事故）─────
  it("sortByManualOrder 忽略季節與釘選，只看 sort_order 與 id", () => {
    const list = [
      exp(6, { sortOrder: 100, windows: EGRET }),        // 季節中
      exp(3, { sortOrder: 100, pinnedUntil: "2026-09-30" }), // 釘選中
      exp(1, { sortOrder: 100 }),
    ];
    // 前台：釘選 → 季節 → 其他
    expect(sortExperiences(list, today).map(e => e.id)).toEqual([3, 6, 1]);
    // 後台的手動順序：三者的 sort_order 相同，所以只依 id
    expect(sortByManualOrder(list).map(e => e.id)).toEqual([1, 3, 6]);
  });

  it("sortByManualOrder 認 sort_order，沒填的當預設值", () => {
    const list = [exp(1, { sortOrder: 50 }), exp(2), exp(3, { sortOrder: 10 })];
    expect(sortByManualOrder(list).map(e => e.id)).toEqual([3, 1, 2]);
  });

  // ── 這是本檔最重要的一條 ──────────────────────────────────
  it("回歸：所有欄位都是預設值時，順序與依 id 排序完全相同", () => {
    const ids = [1, 2, 3, 4, 5, 6];
    // 業主剛執行完 SQL 的狀態：sort_order 全 100、pinned_until 全 NULL、季節表為空
    const fresh = ids.map(id => exp(id, { sortOrder: 100, pinnedUntil: null, windows: [] }));
    expect(sortExperiences(fresh, today).map(e => e.id)).toEqual(ids);

    // 欄位甚至還沒建好（程式先部署）也要退回 id 順序，不能整頁空白
    const noColumns = ids.map(id => exp(id));
    expect(sortExperiences(noColumns, today).map(e => e.id)).toEqual(ids);
  });
});
