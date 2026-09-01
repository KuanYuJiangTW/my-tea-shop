import { describe, it, expect } from "vitest";

import { FRESH_WINDOW_HOURS, isFresh, visibleBirdReport, type BirdReport } from "@/lib/bird-report-core";
import type { AvailabilityWindow } from "@/lib/experience-ordering";

/**
 * 鳥況回報的顯示條件。
 *
 * 這裡釘的是**對外的事實宣稱**。顯示一則過期的「鳥況良好」，客人會開一小時
 * 山路上來，然後發現什麼都沒有——那趟白跑會算在店家頭上，而且他不會再來第二次。
 * 「不顯示」永遠比「顯示過期的」安全，所以每一條都寫成雙向：該顯示的有顯示、
 * 不該顯示的確實沒有。
 *
 * 對應 openspec/changes/bird-report/specs/bird-report/spec.md 的每個 scenario。
 */

const NOW = new Date("2026-09-01T10:00:00+08:00");

/** 賞鳥季：8/22–10/11，NOW 落在區間內 */
const IN_SEASON: AvailabilityWindow[] = [{ startDate: "2026-08-22", endDate: "2026-10-11" }];
/** 已經結束的區間 */
const OFF_SEASON: AvailabilityWindow[] = [{ startDate: "2025-08-22", endDate: "2025-10-11" }];

const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
const report = (h: number, note = "下午 4 點，溪谷方向一大群"): BirdReport =>
  ({ note, reportedAt: hoursAgo(h) });

describe("isFresh", () => {
  it("門檻是 48 小時", () => {
    expect(FRESH_WINDOW_HOURS).toBe(48);
  });

  it("剛好 48 小時仍算新鮮，超過一點就不算", () => {
    expect(isFresh(hoursAgo(48), NOW)).toBe(true);
    expect(isFresh(hoursAgo(48.1), NOW)).toBe(false);
  });

  it("未來時間視為不新鮮——那是資料有問題，不該拿來對客人宣稱", () => {
    expect(isFresh(new Date(NOW.getTime() + 3600_000).toISOString(), NOW)).toBe(false);
  });

  it("不合法的時間字串回 false，不丟例外", () => {
    expect(isFresh("not-a-date", NOW)).toBe(false);
    expect(isFresh("", NOW)).toBe(false);
  });
});

describe("visibleBirdReport — 過期（spec：48 小時自動過期）", () => {
  it("2 小時前的回報：顯示", () => {
    expect(visibleBirdReport(report(2), IN_SEASON, NOW)).not.toBeNull();
  });

  it("15 小時前（昨天傍晚回報、今天上午看）：顯示——賞鳥是下午的事，仍然有用", () => {
    expect(visibleBirdReport(report(15), IN_SEASON, NOW)).not.toBeNull();
  });

  it("49 小時前：不顯示", () => {
    expect(visibleBirdReport(report(49), IN_SEASON, NOW)).toBeNull();
  });

  it("5 天前（業主連續多日沒更新）：不顯示，而且不需要業主手動清除", () => {
    expect(visibleBirdReport(report(24 * 5), IN_SEASON, NOW)).toBeNull();
  });
});

describe("visibleBirdReport — 內容（spec：鳥況回報的內容）", () => {
  it("空字串：不顯示", () => {
    expect(visibleBirdReport({ note: "", reportedAt: hoursAgo(1) }, IN_SEASON, NOW)).toBeNull();
  });

  it("只有空白字元：不顯示", () => {
    expect(visibleBirdReport({ note: "   \n ", reportedAt: hoursAgo(1) }, IN_SEASON, NOW)).toBeNull();
  });

  it("缺回報時間：不顯示", () => {
    expect(visibleBirdReport({ note: "有鳥", reportedAt: "" }, IN_SEASON, NOW)).toBeNull();
  });

  it("沒有任何回報：不顯示", () => {
    expect(visibleBirdReport(null, IN_SEASON, NOW)).toBeNull();
  });

  it("顯示時把原本的回報原樣回傳，不改寫業主寫的字", () => {
    const r = report(3, "8/30 下午下雨，四點後只看到零星幾隻");
    expect(visibleBirdReport(r, IN_SEASON, NOW)).toEqual(r);
  });
});

describe("visibleBirdReport — 季節閘門（spec：季節閘門）", () => {
  it("季節外：不顯示，即使回報是剛剛送出的", () => {
    expect(visibleBirdReport(report(0.1), OFF_SEASON, NOW)).toBeNull();
  });

  it("沒有設定任何區間（不分季節的體驗）：不顯示——鳥況是賞鳥專屬的概念", () => {
    expect(visibleBirdReport(report(1), [], NOW)).toBeNull();
    expect(visibleBirdReport(report(1), undefined, NOW)).toBeNull();
  });

  it("季節最後一天仍然顯示", () => {
    const lastDay = new Date("2026-10-11T09:00:00+08:00");
    const r = { note: "今天最後一天", reportedAt: new Date(lastDay.getTime() - 3600_000).toISOString() };
    expect(visibleBirdReport(r, IN_SEASON, lastDay)).not.toBeNull();
  });

  it("季節結束隔天就不顯示，不必業主手動關", () => {
    const dayAfter = new Date("2026-10-12T09:00:00+08:00");
    const r = { note: "昨天鳥況很好", reportedAt: new Date(dayAfter.getTime() - 3600_000).toISOString() };
    expect(visibleBirdReport(r, IN_SEASON, dayAfter)).toBeNull();
  });
});

describe("visibleBirdReport — 三個條件是 AND 不是 OR", () => {
  it("在季節內但已過期：不顯示", () => {
    expect(visibleBirdReport(report(60), IN_SEASON, NOW)).toBeNull();
  });

  it("很新鮮但在季節外：不顯示", () => {
    expect(visibleBirdReport(report(1), OFF_SEASON, NOW)).toBeNull();
  });

  it("在季節內、很新鮮，但內容是空的：不顯示", () => {
    expect(visibleBirdReport({ note: " ", reportedAt: hoursAgo(1) }, IN_SEASON, NOW)).toBeNull();
  });
});
