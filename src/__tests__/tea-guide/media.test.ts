import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { describe, it, expect } from "vitest";

import { heroVideoFor, sectionImageFor } from "@/lib/tea-guide-media";

// 圖片版位設定的不變量。
//
// 這裡最重要的一條是「路徑真的指到檔案」：這份設定是手寫字串，打錯一個字
// 在正式站上就是一張破圖或一個播不出來的影片，而型別檢查、lint、build
// 全都不會抓到——public/ 底下的檔案對編譯器來說不存在。
//
// 檔案大小上限也釘住：首屏影片是 SEO 落地頁的資產，一旦有人換上一支沒壓過的
// 原始檔（手機直出動輒 100MB 以上），行動網路上的讀者會直接離開。

const SLUG = "cattle-egret-viewing-guide";

/** 對應 public/ 的實體路徑 */
const asset = (src: string) => path.join(process.cwd(), "public", src);

const SECTIONS_WITH_IMAGE = [
  "為什麼叫「萬鷺朝鳳」？",
  "在哪裡看？停車怎麼停？要花錢嗎？",
  "有洗手間嗎？可以待多久？",
  "想拍照的話",
];

describe("首屏影片", () => {
  const hero = heroVideoFor(SLUG);

  it("賞鳥攻略有設定首屏影片", () => {
    expect(hero).not.toBeNull();
  });

  it("影片與 poster 檔案都存在", () => {
    expect(existsSync(asset(hero!.src))).toBe(true);
    expect(existsSync(asset(hero!.poster))).toBe(true);
  });

  it("影片壓過且在 3MB 以內——換上未壓縮原始檔要能被擋下", () => {
    expect(statSync(asset(hero!.src)).size).toBeLessThan(3 * 1024 * 1024);
  });

  it("中英文 alt 都有寫，不是空字串", () => {
    expect(hero!.alt.trim().length).toBeGreaterThan(0);
    expect(hero!.altEn.trim().length).toBeGreaterThan(0);
  });

  it("沒有設定的文章回 null，不會炸掉頁面", () => {
    expect(heroVideoFor("alishan-tea")).toBeNull();
  });
});

describe("段落插圖", () => {
  it.each(SECTIONS_WITH_IMAGE)("「%s」有圖，且檔案存在", heading => {
    const img = sectionImageFor(SLUG, heading);
    expect(img).not.toBeNull();
    expect(existsSync(asset(img!.src))).toBe(true);
  });

  it.each(SECTIONS_WITH_IMAGE)("「%s」中英文 alt 都有寫", heading => {
    const img = sectionImageFor(SLUG, heading)!;
    expect(img.alt.trim().length).toBeGreaterThan(0);
    expect(img.altEn.trim().length).toBeGreaterThan(0);
  });

  it.each(SECTIONS_WITH_IMAGE)("「%s」的圖說中英成對——只有一邊會讓另一種語言看到空白", heading => {
    const img = sectionImageFor(SLUG, heading)!;
    expect(Boolean(img.caption)).toBe(Boolean(img.captionEn));
  });

  it("查不到的小標回 null——小標在 Sanity 被改動時只是沒有圖，不是壞頁面", () => {
    expect(sectionImageFor(SLUG, "這個小標不存在")).toBeNull();
    expect(sectionImageFor(SLUG, "")).toBeNull();
  });

  it("查不到的文章回 null", () => {
    expect(sectionImageFor("no-such-article", "想拍照的話")).toBeNull();
  });

  it("同一篇裡沒有兩段共用同一張圖——重複用會讓文章看起來在灌水", () => {
    const srcs = SECTIONS_WITH_IMAGE.map(h => sectionImageFor(SLUG, h)!.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
});
