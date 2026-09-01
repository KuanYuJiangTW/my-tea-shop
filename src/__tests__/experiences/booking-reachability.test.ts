import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 體驗頁上「預約入口拿不拿得到」的不變量。
 *
 * 起因（2026-08-31）：業主回報手機版要滑很久才看到「選擇場次」。量測後是
 * 2.4 個螢幕，其中 586px 是我把「怎麼來」擺在月曆上方造成的。
 *
 * 但真正的問題比位置更根本：**整頁 8.5 個螢幕，滑過月曆之後預約入口就完全
 * 消失了**——看注意事項、看相簿、看評價的人想回頭訂位，得自己往回捲。
 * 所以除了把「怎麼來」搬到預約流程之後，也加了一條小型懸浮條。
 *
 * 這裡釘兩件會靜默壞掉的事：
 *   1. `#booking` 錨點——懸浮條靠它決定何時收起、按鈕也靠它捲過去。
 *      id 被改名的話兩個功能同時失效，而且不會有任何錯誤訊息。
 *   2. 「怎麼來」不得再回到月曆前面。
 */

const read = (p: string) => readFileSync(join(__dirname, "../../../", p), "utf8");
const page = () => read("src/app/experiences/[slug]/page.tsx");

describe("預約區塊的錨點", () => {
  it("月曆容器帶著 id=\"booking\"", () => {
    expect(page()).toContain('id="booking"');
  });

  it("懸浮條指向的就是那個 id——兩邊寫死，不能各改各的", () => {
    expect(page()).toContain('<StickyBookingBar price={experience.price} anchorId="booking" />');
  });

  it("錨點有 scroll-mt，捲過去時不會被 sticky header 蓋住標題", () => {
    const m = page().match(/id="booking"[^>]*className="([^"]*)"/);
    expect(m, '找不到 #booking 的 className').not.toBeNull();
    expect(m![1]).toContain("scroll-mt-");
  });
});

describe("版面順序", () => {
  const idx = (needle: string) => {
    const at = page().indexOf(needle);
    expect(at, `頁面裡找不到 ${needle}`).toBeGreaterThan(-1);
    return at;
  };

  it("三階方案在月曆之前——看到「450 才能看鳥」就走掉的人要先知道還有兩種選擇", () => {
    expect(idx("<AdmissionTiers")).toBeLessThan(idx('id="booking"'));
  });

  it("「怎麼來」在月曆之後。它是出發當天才用得到的東西，不該擋在預約前面", () => {
    expect(idx("<VisitDirections")).toBeGreaterThan(idx('id="booking"'));
  });

  it("找不到日期的出口仍緊接月曆，中間沒有被插入別的區塊", () => {
    const between = page().slice(idx('id="booking"'), idx("experience.acceptsRequests"));
    expect(between).not.toContain("<VisitDirections");
    expect(between).not.toContain("<AdmissionTiers");
  });

  it("體驗頁用精簡版、攻略文用完整版——兩邊讀者的處境不同", () => {
    // 體驗頁：讀者已經在看這款要不要訂，只需要知道開去哪
    expect(page()).toContain("<VisitDirections compact />");
    // 攻略文：讀者在規劃行程，需要車程表與完整路況
    const article = read("src/app/tea-guide/[slug]/page.tsx");
    expect(article).toContain("<VisitDirections />");
    expect(article).not.toContain("<VisitDirections compact");
  });

  it("容器讓出懸浮條的高度，否則會蓋住頁尾內容", () => {
    expect(page()).toContain('paddingBottom: "var(--floating-cta-h, 0px)"');
  });
});

describe("懸浮條用到的 i18n 鍵", () => {
  const experiences = (locale: string) =>
    (JSON.parse(read(`messages/${locale}.json`)) as Record<string, Record<string, string>>).experiences;

  it.each(["viewSessions", "perPerson"])("兩種語言都有 %s", key => {
    for (const locale of ["zh", "en"]) {
      const v = experiences(locale)[key];
      expect(v, `messages/${locale}.json 缺 experiences.${key}`).toBeTruthy();
      expect(v.trim().length).toBeGreaterThan(0);
    }
  });
});
