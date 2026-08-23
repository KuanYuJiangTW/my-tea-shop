import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 前台入口的顯示條件，用靜態掃描守住。
 *
 * `accepts_requests` 是這個功能的總開關——關著時前台不該出現任何相關 UI，
 * 因為那是業主逐款上線的節奏。這件事沒辦法用單元測試驗（要渲染整頁 server
 * component），但**「條件有沒有被拿掉」是掃得出來的**，而那正是最可能在
 * 重構中出事的地方。專案已有同類的靜態掃描（route-auth-coverage）。
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const PAGE = "src/app/experiences/[slug]/page.tsx";

describe("開課請求入口的顯示條件", () => {
  it("入口被 acceptsRequests 包住——關著時完全不渲染", () => {
    const src = read(PAGE);
    expect(src).toContain("<OpenClassRequest");
    // 條件與元件必須在同一段：`{experience.acceptsRequests ? (` … `<OpenClassRequest`
    const gate = src.indexOf("experience.acceptsRequests");
    const use  = src.indexOf("<OpenClassRequest");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(use);
  });

  it("關著時退回 Phase 0 的輕量登記，而不是什麼都沒有", () => {
    const src = read(PAGE);
    // 兩者在同一個三元運算裡，代表不會同時出現、也不會同時消失
    expect(src).toMatch(/experience\.acceptsRequests \? \([\s\S]*<OpenClassRequest[\s\S]*\) : \([\s\S]*<InterestForm/);
  });
});

describe("自助查詢頁不得被搜尋引擎收錄", () => {
  it("宣告了 noindex", () => {
    const src = read("src/app/experiences/request/[token]/page.tsx");
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it("不在 sitemap 裡", () => {
    expect(read("src/app/sitemap.ts")).not.toContain("experiences/request");
  });
});

describe("內部備註不得外流", () => {
  it("客人端的 select 是白名單式的，沒有列 admin_note", () => {
    const src = read("src/app/api/experience-requests/[token]/route.ts");
    const fields = src.slice(src.indexOf("CLIENT_FIELDS"), src.indexOf("export async function GET"));
    expect(fields).not.toContain("admin_note");
    // 不能改成 select("*")——那樣新增欄位就會自動外洩
    expect(src).not.toContain('.select("*")');
  });
});
