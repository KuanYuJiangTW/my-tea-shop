import { describe, it, expect } from "vitest";

import { faqPageJsonLd, seasonalEventJsonLd } from "@/lib/seo";

// FAQPage 與 Event 兩組結構化資料的不變量。
//
// 背景（2026-08-25）：Search Console 顯示賞鳥季查詢 28 曝光只換到 1 次點擊，
// 平均排序 10.3——排在第一頁最底部。攻略文的小標本來就全是讀者的問句
// （「什麼時候來最好？」），卻只輸出 Article，沒有 FAQPage；季節限定體驗有
// 明確起訖日期，卻沒有 Event。兩者都是「不必推排名就能多佔版面」的機會。
//
// 這裡釘住的是**輸出與不輸出的界線**：無效的標記比沒有標記更傷，
// 一個沒有答案的 Question 會讓整組 FAQPage 失效，一個已經結束的 Event
// 會讓 Google 顯示過期活動。

const PAGE_URL = "https://taiwantea.store/tea-guide/cattle-egret-viewing-guide";

describe("faqPageJsonLd", () => {
  it("只收問號結尾的小標，敘事段落不進 FAQ", () => {
    const jsonLd = faqPageJsonLd(
      [
        { heading: "什麼時候來最好？", paragraphs: ["季節是每年 8 月到 10 月。"] },
        { heading: "這件事是怎麼開始的", paragraphs: ["從我們家門口的停車場開始推廣。"] },
        { heading: "有洗手間嗎？可以待多久？", paragraphs: ["有。信淳茶居這邊有洗手間。"] },
      ],
      PAGE_URL,
    );

    expect(jsonLd?.mainEntity).toHaveLength(2);
    expect(jsonLd?.mainEntity.map(q => q.name)).toEqual([
      "什麼時候來最好？",
      "有洗手間嗎？可以待多久？",
    ]);
  });

  it("半形問號與結尾空白都算問句", () => {
    const jsonLd = faqPageJsonLd(
      [
        { heading: "Where do I park?", paragraphs: ["Seven spaces at the tea house."] },
        { heading: "什麼時候來最好？  ", paragraphs: ["8 月到 10 月。"] },
      ],
      PAGE_URL,
    );

    expect(jsonLd?.mainEntity).toHaveLength(2);
    // 小標存進 name 之前要 trim，尾端空白會原封不動出現在搜尋結果裡
    expect(jsonLd?.mainEntity[1].name).toBe("什麼時候來最好？");
  });

  it("沒有答案的問句要跳過——空的 Question 會讓整組標記失效", () => {
    const jsonLd = faqPageJsonLd(
      [
        { heading: "有洗手間嗎？", paragraphs: [] },
        { heading: "要花錢嗎？", paragraphs: ["   ", ""] },
        { heading: "幾點來？", paragraphs: ["下午 2 點開始。"] },
      ],
      PAGE_URL,
    );

    expect(jsonLd?.mainEntity).toHaveLength(1);
    expect(jsonLd?.mainEntity[0].name).toBe("幾點來？");
  });

  it("一個問句都沒有就回 null，不對敘事型文章硬套 FAQ 標記", () => {
    const jsonLd = faqPageJsonLd(
      [
        { heading: "這件事是怎麼開始的", paragraphs: ["很久以前。"] },
        { heading: "想拍照的話", paragraphs: ["下午四點以後光線最好。"] },
      ],
      PAGE_URL,
    );

    expect(jsonLd).toBeNull();
  });

  it("多段答案接成一段文字，@id 掛在頁面網址底下", () => {
    const jsonLd = faqPageJsonLd(
      [{ heading: "要花錢嗎？", paragraphs: ["停車不用錢。", "看鳥茶位每人 150 元。"] }],
      PAGE_URL,
    );

    expect(jsonLd?.["@id"]).toBe(`${PAGE_URL}#faq`);
    expect(jsonLd?.mainEntity[0].acceptedAnswer.text).toBe("停車不用錢。\n看鳥茶位每人 150 元。");
  });
});

describe("seasonalEventJsonLd", () => {
  const base = {
    name:        "萬鷺朝鳳・茶山導覽",
    description: "秋季限定的黃頭鷺生態導覽。",
    image:       "https://taiwantea.store/images/gallery/picking2.jpg",
    url:         "https://taiwantea.store/experiences/cattle-egret-tour",
    startDate:   "2026-08-22",
    endDate:     "2026-10-11",
    startTimes:  ["14:00"],
    price:       450,
    baseUrl:     "https://taiwantea.store",
  };

  it("帶時段時，日期要接上時間與 +08:00——不標時區等於讓 Google 自己猜", () => {
    const jsonLd = seasonalEventJsonLd(base);

    expect(jsonLd.startDate).toBe("2026-08-22T14:00:00+08:00");
    expect(jsonLd.endDate).toBe("2026-10-11T14:00:00+08:00");
  });

  it("季節限定體驗是「期間內每天重複」，要輸出 Schedule", () => {
    const jsonLd = seasonalEventJsonLd(base);

    expect(jsonLd.eventSchedule).toMatchObject({
      "@type":           "Schedule",
      startDate:         "2026-08-22",
      endDate:           "2026-10-11",
      startTime:         "14:00",
      repeatFrequency:   "P1D",
      scheduleTimezone:  "Asia/Taipei",
    });
  });

  it("沒有固定時段就不輸出 Schedule，日期也維持純日期", () => {
    const jsonLd = seasonalEventJsonLd({ ...base, startTimes: [] });

    expect(jsonLd.eventSchedule).toBeUndefined();
    expect(jsonLd.startDate).toBe("2026-08-22");
  });

  it("offers 的價格與網址要與同頁 Product 一致，避免兩份標記各說各話", () => {
    const jsonLd = seasonalEventJsonLd(base);

    expect(jsonLd.offers).toMatchObject({
      price:         450,
      priceCurrency: "TWD",
      url:           base.url,
      validFrom:     "2026-08-22",
    });
  });

  it("organizer 指向首頁的 LocalBusiness 節點，不另外宣告孤立的 Organization", () => {
    const jsonLd = seasonalEventJsonLd(base);

    expect(jsonLd.organizer["@id"]).toBe("https://taiwantea.store/#business");
    expect(jsonLd.location.geo).toMatchObject({ latitude: 23.5537537, longitude: 120.6324229 });
  });
});
