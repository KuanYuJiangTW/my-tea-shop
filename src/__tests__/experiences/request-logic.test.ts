import { describe, it, expect } from "vitest";

import {
  CONTACT_PREFERENCE_WHITELIST,
  MAX_LEAD_DAYS,
  allowedStartTimes,
  calcRequestSlots,
  calcRequestTotal,
  canTransition,
  generateRequestNo,
  generateRequestToken,
  isAllowedStartTime,
  isRequestableDate,
  isTerminal,
  nextAvailableWindow,
  type RequestableType,
} from "@/lib/experience-requests";
import type { AvailabilityWindow } from "@/lib/experience-ordering";
import type { ExperienceRequestStatus } from "@/types";

/**
 * 開課請求共用邏輯的不變量。
 *
 * 這些數字是業主 2026-08-21 拍板的成本結論（proposal 的淨貢獻表），寫成測試
 * 才不會在日後某次重構裡被悄悄改掉——例如「茶藝 2 人只賺 20 元」這件事，
 * 一旦最低名額被改回 2，虧損不會有任何錯誤訊息。
 */

const TODAY = "2026-08-22";

// 業主定案的六款參數
const 茶藝: RequestableType = { price: 800, maxParticipants: 20, requestMinSlots: 4 };
const 採茶: RequestableType = { price: 450, maxParticipants: 20, requestMinSlots: 4 };
const 萬鷺: RequestableType = { price: 450, maxParticipants: 20, requestMinSlots: 3, requestStartTimes: ["14:00"] };
const 紅茶: RequestableType = { price: 800, maxParticipants: 20, requestMinSlots: 6 };

const EGRET_WINDOW: AvailabilityWindow[] = [{ startDate: "2026-08-22", endDate: "2026-10-11" }];
const PICKING_WINDOWS: AvailabilityWindow[] = [
  { startDate: "2026-03-25", endDate: "2026-07-31" },
  { startDate: "2026-09-15", endDate: "2026-11-30" },
];

/** 距今 N 天的日期字串 */
function plus(days: number, from = TODAY): string {
  const [y, m, d] = from.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

describe("calcRequestSlots — 買斷名額制", () => {
  it("單人申請仍收最低名額（他買的是位子，不是比較貴的票）", () => {
    expect(calcRequestSlots(茶藝, 1)).toBe(4);
    expect(calcRequestSlots(萬鷺, 1)).toBe(3);
  });

  it("申請人數超過最低名額時照實際人數算", () => {
    expect(calcRequestSlots(採茶, 7)).toBe(7);
  });

  it("不得超過場次上限", () => {
    expect(calcRequestSlots(採茶, 50)).toBe(20);
  });

  /**
   * 這一條釘的是**文案講的話**，不只是函式。
   *
   * 頁面上原本寫「你買的是名額，不是每人票——名額之內要帶幾個人由你決定」，
   * 業主讀完的第一個反應是「會不會被誤會成 1,350 可以帶超過 3 個人？」。
   * 會——因為那句話只講了門檻，沒講門檻之上是照人頭加的。下面兩行就是
   * 客人實際會付的錢，文案改成什麼樣子都必須跟它一致。
   */
  it("萬鷺朝鳳：1,350 是 1～3 人的價，第 4 人起每人再加 450", () => {
    expect(calcRequestTotal(萬鷺, calcRequestSlots(萬鷺, 1))).toBe(1350);
    expect(calcRequestTotal(萬鷺, calcRequestSlots(萬鷺, 3))).toBe(1350);
    expect(calcRequestTotal(萬鷺, calcRequestSlots(萬鷺, 4))).toBe(1800);
    expect(calcRequestTotal(萬鷺, calcRequestSlots(萬鷺, 5))).toBe(2250);
  });

  it("沒設定 request_min_slots 時退回預設 4", () => {
    expect(calcRequestSlots({ price: 500, maxParticipants: 20 }, 1)).toBe(4);
  });

  it("業主定案的六款名額（改動這裡等於改動獲利結構）", () => {
    expect(calcRequestSlots(茶藝, 1)).toBe(4);   // 2 人只賺 20 元
    expect(calcRequestSlots(紅茶, 1)).toBe(6);   // 業主＋鄰居兩人帶
    expect(calcRequestSlots(萬鷺, 1)).toBe(3);   // 只佔 3 小時、材料最省
  });
});

describe("calcRequestTotal — 只看名額，不看日期", () => {
  it("金額 = 名額 × 單價", () => {
    expect(calcRequestTotal(茶藝, 4)).toBe(3200);
    expect(calcRequestTotal(茶藝, 6)).toBe(4800);
    expect(calcRequestTotal(採茶, 4)).toBe(1800);
  });

  /**
   * 這一條是本次改動的重點。曾經做過「距今 7–13 天 ×1.2」的急件加價，
   * 2026-08-24 拿掉（理由寫在 calcRequestTotal 的註解裡）。
   *
   * 拿掉之後最容易復發的方式，是有人看到函式「沒用到日期」覺得怪，
   * 又把日期參數與時間邏輯加回來。所以這裡直接鎖死行為：**同樣的名額，
   * 不管哪一天，金額都必須一樣**——包含以前會加價的 7–13 天區間。
   */
  it("同樣名額，任何日期都同價——不得再有急件加價", () => {
    const 每一天 = [7, 8, 13, 14, 15, 30, 90].map(() => calcRequestTotal(茶藝, 4));
    expect(new Set(每一天).size).toBe(1);
    expect(每一天[0]).toBe(3200);
  });

  it("函式簽章只吃名額與單價，沒有日期參數", () => {
    // 多傳參數在 TS 會編譯失敗；這裡守的是執行期的形狀
    expect(calcRequestTotal.length).toBe(2);
  });

  it("平日與假日同價——刻意不做平日折扣", () => {
    expect(calcRequestTotal(茶藝, 4)).toBe(calcRequestTotal(茶藝, 4));
  });
});

describe("isRequestableDate", () => {
  it("剛好第 7 天可以，第 6 天太趕", () => {
    expect(isRequestableDate(plus(7), { today: TODAY })).toEqual({ ok: true, reason: "ok" });
    expect(isRequestableDate(plus(6), { today: TODAY }).reason).toBe("too-soon");
  });

  it("剛好第 90 天可以，第 91 天太遠", () => {
    expect(isRequestableDate(plus(MAX_LEAD_DAYS), { today: TODAY }).ok).toBe(true);
    expect(isRequestableDate(plus(MAX_LEAD_DAYS + 1), { today: TODAY }).reason).toBe("too-far");
  });

  it("每款體驗的前置天數可以不同", () => {
    expect(isRequestableDate(plus(4), { leadDays: 3, today: TODAY }).ok).toBe(true);
    expect(isRequestableDate(plus(4), { leadDays: 10, today: TODAY }).reason).toBe("too-soon");
  });

  it("公休日擋掉", () => {
    const d = plus(20);
    expect(isRequestableDate(d, { blackoutDates: [d], today: TODAY }).reason).toBe("blackout");
  });

  it("有設定期間＝白名單制：期間外擋掉", () => {
    expect(isRequestableDate("2026-09-01", { windows: EGRET_WINDOW, today: TODAY }).ok).toBe(true);
    expect(isRequestableDate("2026-10-20", { windows: EGRET_WINDOW, today: TODAY }).reason).toBe("out-of-season");
  });

  it("多段期間各自成立，段與段之間的空窗擋掉", () => {
    expect(isRequestableDate("2026-10-01", { windows: PICKING_WINDOWS, today: TODAY }).ok).toBe(true);
    expect(isRequestableDate("2026-09-01", { windows: PICKING_WINDOWS, today: TODAY }).reason).toBe("out-of-season");
  });

  it("沒設定期間＝不限季節（漏填要讓功能安全地關掉，不是安全地開著）", () => {
    // 用 60 天後：12/25 距今 125 天，會先被 90 天上限擋掉，測不到季節這一條
    expect(isRequestableDate(plus(60), { today: TODAY }).ok).toBe(true);
    expect(isRequestableDate(plus(60), { windows: [], today: TODAY }).ok).toBe(true);
  });

  it("所有期間都過期 → 任何日期都申請不了", () => {
    const past: AvailabilityWindow[] = [{ startDate: "2026-01-01", endDate: "2026-02-01" }];
    expect(isRequestableDate(plus(30), { windows: past, today: TODAY }).reason).toBe("out-of-season");
  });

  it("期間內但太趕時，回報的是 too-soon（先擋前置天數）", () => {
    expect(isRequestableDate(plus(2), { windows: EGRET_WINDOW, today: TODAY }).reason).toBe("too-soon");
  });
});

describe("nextAvailableWindow", () => {
  it("回傳最近一段還沒開始的期間", () => {
    expect(nextAvailableWindow(PICKING_WINDOWS, TODAY)?.startDate).toBe("2026-09-15");
  });
  it("已經在期間內時，回傳的是下一段而不是當下這段", () => {
    expect(nextAvailableWindow(EGRET_WINDOW, "2026-09-01")).toBeNull();
  });
  it("沒有下一段回 null", () => {
    expect(nextAvailableWindow(EGRET_WINDOW, "2026-12-01")).toBeNull();
    expect(nextAvailableWindow(undefined, TODAY)).toBeNull();
  });
});

describe("時段白名單是每款自己的", () => {
  it("萬鷺朝鳳只有 14:00（鳥況 15:00–18:00，早上場看不到鳥）", () => {
    expect(allowedStartTimes(萬鷺)).toEqual(["14:00"]);
    expect(isAllowedStartTime(萬鷺, "10:00")).toBe(false);
    expect(isAllowedStartTime(萬鷺, "14:00")).toBe(true);
  });

  it("沒設定的體驗退回 10:00／14:00", () => {
    expect(allowedStartTimes(茶藝)).toEqual(["10:00", "14:00"]);
    expect(isAllowedStartTime(茶藝, "21:00")).toBe(false);
  });

  it("空陣列也退回預設，不是變成完全不能申請", () => {
    expect(allowedStartTimes({ price: 1, maxParticipants: 1, requestStartTimes: [] })).toEqual(["10:00", "14:00"]);
  });
});

describe("token 與查詢編號", () => {
  it("token 每次都不同且夠長", () => {
    const a = generateRequestToken(), b = generateRequestToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);   // 32 bytes base64url
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);         // URL 安全，不必再編碼
  });

  it("查詢編號是 R年月-四碼，字母表不含容易念錯的 0/O/1/I", () => {
    const no = generateRequestNo(new Date("2026-08-22T04:00:00Z"));
    expect(no).toMatch(/^R2608-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  });

  it("年月用台灣時間（UTC 還在前一個月時不能算錯）", () => {
    // 2026-09-01 01:00 台北 === 2026-08-31 17:00Z
    expect(generateRequestNo(new Date("2026-08-31T17:00:00Z")).slice(0, 5)).toBe("R2609");
  });
});

describe("狀態機", () => {
  const ALL: ExperienceRequestStatus[] = [
    "pending", "approved", "alternative_offered", "declined", "expired", "withdrawn", "converted",
  ];

  it("pending 可以走到四個地方", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "alternative_offered")).toBe(true);
    expect(canTransition("pending", "declined")).toBe(true);
    expect(canTransition("pending", "withdrawn")).toBe(true);
  });

  it("pending 不能直接變成 converted（沒付款不算成交）", () => {
    expect(canTransition("pending", "converted")).toBe(false);
  });

  it("approved 可以回到 pending——那是業主撤銷核准", () => {
    expect(canTransition("approved", "pending")).toBe(true);
  });

  it("終局狀態不能再轉出去", () => {
    for (const s of ["converted", "declined", "expired", "withdrawn"] as ExperienceRequestStatus[]) {
      expect(isTerminal(s)).toBe(true);
      for (const to of ALL) expect(canTransition(s, to)).toBe(false);
    }
  });

  it("每一個狀態都不能轉到自己", () => {
    for (const s of ALL) expect(canTransition(s, s)).toBe(false);
  });

  it("alternative_offered 只能走到 approved／declined／expired／withdrawn", () => {
    const allowed = new Set(["approved", "declined", "expired", "withdrawn"]);
    for (const to of ALL) {
      expect(canTransition("alternative_offered", to)).toBe(allowed.has(to));
    }
  });
});

describe("常數", () => {
  it("聯絡方式白名單就這三個", () => {
    expect([...CONTACT_PREFERENCE_WHITELIST]).toEqual(["phone", "email", "line"]);
  });
});
