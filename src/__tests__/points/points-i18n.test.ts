import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { translatePointsDescription, isKnownMemberTier } from "@/lib/points-i18n";
import zh from "../../../messages/zh.json";
import en from "../../../messages/en.json";

/**
 * 點數帳本描述的顯示層翻譯。
 *
 * `point_transactions.description` 在資料庫裡是中文字面值（含歷史資料），英文版只能在
 * 顯示層對回 i18n key。這支測試釘住三件事：
 *
 * 1. 每一種**實際會寫進資料庫**的字串都認得出來——不是我列了哪些，而是**掃描原始碼**
 *    把所有寫入點抓出來比對。新增寫入點卻忘了補對照表，這裡會變紅（JUDG-8：
 *    證據要分得出成功與失敗）。
 * 2. 認不出來的回 `null`，呼叫端才知道要原樣顯示，不會猜成別的意思。
 * 3. 對照表指到的 key 在 zh 與 en 兩份 messages 裡都真的存在。
 */

// ─── 1. 掃描原始碼，找出所有寫進 point_transactions.description 的字面值 ──────────

const SRC = join(__dirname, "../../");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      return entry === "__tests__" || entry === "node_modules" ? [] : walk(p);
    }
    return p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  });
}

/**
 * 只掃「真的會寫點數帳本」的檔案。`description:` 這個鍵在專案裡到處都是
 * （頁面 metadata、Sanity schema 欄位說明），不篩掉的話掃描器會被雜訊淹沒，
 * 等於沒有鑑別力。判準：檔案內容出現 `point_transactions` 或引用 `@/lib/points`。
 */
function isPointsLedgerFile(src: string): boolean {
  return src.includes("point_transactions") || /from\s+["']@\/lib\/points["']/.test(src);
}

/**
 * 抓 `description: "…"` 與 `description: description ?? "…"`（含 backtick 模板）。
 * 模板裡的 `${...}` 一律換成 `123`——`折抵 NT$${points}` → `折抵 NT$123`、
 * `管理員調整：${note}` → `管理員調整：123`，兩種型態都能還原成真實會寫入的形狀。
 */
function collectDescriptionLiterals(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const re = /description:\s*(?:description\s*\?\?\s*)?(["'`])([^"'`]*)\1/g;
  for (const file of walk(SRC)) {
    const src = readFileSync(file, "utf8");
    if (!isPointsLedgerFile(src)) continue;
    for (const m of src.matchAll(re)) {
      const text = m[2].replace(/\$\{[^}]*\}/g, "123");
      // 只收含中文的（`description: ""` 之類的空值與英文欄位定義不算）
      if (/[一-鿿]/.test(text) || text.startsWith("PayPal")) {
        out.push({ file: file.slice(SRC.length).replace(/\\/g, "/"), text });
      }
    }
  }
  return out;
}

describe("點數帳本描述的顯示層翻譯", () => {
  it("原始碼裡每一個寫入 description 的字面值都對得到 i18n key", () => {
    const literals = collectDescriptionLiterals();

    // 事前期望值：掃不到東西時測試必須失敗，否則這條等於沒測
    expect(literals.length).toBeGreaterThanOrEqual(10);

    const unmapped = literals.filter(l => translatePointsDescription(l.text) === null);
    expect(unmapped, `這些描述沒有對照表，英文版會露出中文：\n${unmapped.map(u => `  ${u.text}  (${u.file})`).join("\n")}`).toEqual([]);
  });

  it("掃描器本身有鑑別力：故意沒收錄的字串會被判為 unmapped", () => {
    expect(translatePointsDescription("這是一個不存在的描述")).toBeNull();
  });

  // ─── 2. 各型態的對照結果 ──────────────────────────────────────────────────

  it("完全比對的描述", () => {
    expect(translatePointsDescription("消費回饋")?.key).toBe("earn");
    expect(translatePointsDescription("訂單取消退還點數")?.key).toBe("orderCancelRefund");
    expect(translatePointsDescription("體驗預約取消退還點數")?.key).toBe("bookingCancelRefund");
    expect(translatePointsDescription("PayPal 建立失敗退還點數")?.key).toBe("paypalFailedRefund");
  });

  it("金額型抽出 amount，且「訂單折抵」不會被當成「折抵」", () => {
    expect(translatePointsDescription("折抵 NT$10")).toEqual({ key: "redeem", values: { amount: "10" }, suffixKey: undefined });
    expect(translatePointsDescription("訂單折抵 NT$1,200")).toEqual({ key: "orderRedeem", values: { amount: "1,200" }, suffixKey: undefined });
    expect(translatePointsDescription("體驗預約折抵 NT$88")).toEqual({ key: "bookingRedeem", values: { amount: "88" }, suffixKey: undefined });
  });

  it("管理員調整：備註是自由文字，原樣帶過去", () => {
    const r = translatePointsDescription("管理員調整：客訴補償");
    expect(r?.key).toBe("adminAdjust");
    expect(r?.values?.note).toBe("客訴補償");
  });

  it("歷史資料的「（系統補發）」後綴會被剝離成 suffixKey", () => {
    const r = translatePointsDescription("體驗預約取消退還點數（系統補發）");
    expect(r?.key).toBe("bookingCancelRefund");
    expect(r?.suffixKey).toBe("systemBackfill");
  });

  it("空值與認不得的字串回 null，呼叫端才會原樣顯示", () => {
    expect(translatePointsDescription(null)).toBeNull();
    expect(translatePointsDescription("")).toBeNull();
    expect(translatePointsDescription("某個未來才會出現的描述")).toBeNull();
  });

  // ─── 3. key 在兩份 messages 裡都存在 ──────────────────────────────────────

  it("對照表用到的 key，zh 與 en 都有定義", () => {
    const samples = [
      "消費回饋", "取消退還點數", "訂單取消退還點數", "體驗預約取消退還點數",
      "訂單完成回饋", "體驗完成回饋", "場次取消退還點數", "逾期未付款取消退還點數",
      "PayPal 建立失敗退還點數", "折抵 NT$10", "訂單折抵 NT$10", "體驗預約折抵 NT$10",
      "管理員調整：測試", "體驗預約取消退還點數（系統補發）",
    ];
    const zhLedger = zh.account.pointsLedger as Record<string, string>;
    const enLedger = en.account.pointsLedger as Record<string, string>;

    for (const s of samples) {
      const label = translatePointsDescription(s);
      expect(label, s).not.toBeNull();
      for (const key of [label!.key, label!.suffixKey].filter(Boolean) as string[]) {
        expect(zhLedger[key], `zh 缺 ${key}`).toBeTruthy();
        expect(enLedger[key], `en 缺 ${key}`).toBeTruthy();
      }
    }
  });
});

describe("會員等級名稱", () => {
  it("三個既有等級都認得，未知等級回 false 讓呼叫端 fallback", () => {
    for (const id of ["standard", "silver", "gold"]) expect(isKnownMemberTier(id)).toBe(true);
    expect(isKnownMemberTier("platinum")).toBe(false);
    expect(isKnownMemberTier(null)).toBe(false);
  });

  it("等級名稱在 common.memberTier 下，zh 與 en 都有", () => {
    for (const id of ["standard", "silver", "gold"] as const) {
      expect((zh.common.memberTier as Record<string, string>)[id]).toBeTruthy();
      expect((en.common.memberTier as Record<string, string>)[id]).toBeTruthy();
    }
  });
});
