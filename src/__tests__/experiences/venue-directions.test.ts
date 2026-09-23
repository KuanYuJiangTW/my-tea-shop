import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import {
  DRIVE_TIMES, NO_CAR_NOTE, NO_CAR_NOTE_EN, ROAD_NOTE, ROAD_NOTE_EN, STREET_ADDRESS,
  TEA_HOUSE, VIEWING_PLATFORM, directionsUrl,
} from "@/lib/venue";
import { showsDirectionsAfter } from "@/lib/tea-guide-media";

/**
 * 交通資訊的不變量。
 *
 * 起因（2026-08-31）：業主回報「很多客人在網路上找到文章後不知道怎麼來」。
 * 查下去發現全站沒有任何地圖或導航連結——地址只在 email 與 JSON-LD 裡。
 *
 * 這裡釘的是**座標**。導航按鈕把人送到錯的地方，比沒有導航更糟：在山路上
 * 發現走錯要找地方迴轉，而且那通常發生在下午三點以後、正要開始有鳥的時候。
 * 座標是手抄自業主提供的 Google 分享連結，抄錯一位數就是差好幾公里，
 * 而型別檢查與 build 都不會有意見。
 */

const root = (p: string) => join(__dirname, "../../../", p);
const read = (p: string) => readFileSync(root(p), "utf8");

// 業主 2026-08-31 提供的分享連結解析值（!8m2!3d<lat>!4d<lng>）
const EXPECTED = {
  teaHouse: { lat: 23.5537537, lng: 120.6324229 },
  platform: { lat: 23.553223,  lng: 120.632091  },
};

describe("兩個地點的座標", () => {
  it("信淳茶居的座標與業主提供的一致", () => {
    expect(TEA_HOUSE.lat).toBe(EXPECTED.teaHouse.lat);
    expect(TEA_HOUSE.lng).toBe(EXPECTED.teaHouse.lng);
  });

  it("景觀平台停車場的座標與業主提供的一致", () => {
    expect(VIEWING_PLATFORM.lat).toBe(EXPECTED.platform.lat);
    expect(VIEWING_PLATFORM.lng).toBe(EXPECTED.platform.lng);
  });

  it("茶居的座標與首頁 JSON-LD 的 LocalBusiness 一致——兩處寫死，不能各走各的", () => {
    const home = read("src/app/page.tsx");
    expect(home).toContain(String(TEA_HOUSE.lat));
    expect(home).toContain(String(TEA_HOUSE.lng));
  });

  it("兩個地點不是同一個座標", () => {
    expect(`${TEA_HOUSE.lat},${TEA_HOUSE.lng}`).not.toBe(`${VIEWING_PLATFORM.lat},${VIEWING_PLATFORM.lng}`);
  });

  it("座標落在梅山太興村附近——抄錯位數會掉到別的縣市", () => {
    for (const d of [TEA_HOUSE, VIEWING_PLATFORM]) {
      expect(d.lat).toBeGreaterThan(23.5);
      expect(d.lat).toBeLessThan(23.6);
      expect(d.lng).toBeGreaterThan(120.6);
      expect(d.lng).toBeLessThan(120.7);
    }
  });
});

describe("精簡版的按鈕標籤", () => {
  it("兩個地點都有短名稱，且不比完整名稱長", () => {
    for (const d of [TEA_HOUSE, VIEWING_PLATFORM]) {
      expect(d.shortName.length).toBeGreaterThan(0);
      expect(d.shortName.length).toBeLessThanOrEqual(d.name.length);
      expect(d.shortNameEn.length).toBeGreaterThan(0);
    }
  });

  it("停車場的短名稱要短到能在 375px 單行放得下——完整名稱有 17 個字會折行", () => {
    expect(VIEWING_PLATFORM.shortName.length).toBeLessThanOrEqual(9);
  });

  it("短名稱只影響按鈕文字，導航仍然帶座標", () => {
    expect(directionsUrl(VIEWING_PLATFORM)).toContain("23.553223%2C120.632091");
  });
});

describe("導航連結", () => {
  it("用官方的 api=1 通用格式，手機才會直接開 Google 地圖 App", () => {
    expect(directionsUrl(TEA_HOUSE)).toContain("https://www.google.com/maps/dir/?api=1&destination=");
  });

  it("目的地帶的是座標而不是地點名稱——名稱在山區可能被解析到別的地方", () => {
    expect(directionsUrl(TEA_HOUSE)).toContain("23.5537537%2C120.6324229");
    expect(directionsUrl(VIEWING_PLATFORM)).toContain("23.553223%2C120.632091");
  });

  it("業主提供的地點頁連結兩個都在，且不相同", () => {
    expect(TEA_HOUSE.placeUrl).toMatch(/^https:\/\/maps\.app\.goo\.gl\//);
    expect(VIEWING_PLATFORM.placeUrl).toMatch(/^https:\/\/maps\.app\.goo\.gl\//);
    expect(TEA_HOUSE.placeUrl).not.toBe(VIEWING_PLATFORM.placeUrl);
  });
});

describe("車程與路況", () => {
  it("三個起點都在，而且是業主實際開過的時間", () => {
    expect(DRIVE_TIMES.map(d => d.from)).toEqual(["梅山交流道", "嘉義市區", "高鐵嘉義站"]);
    expect(DRIVE_TIMES.map(d => d.minutes)).toEqual([44, 60, 70]);
  });

  it("每個起點中英文都有，缺一邊英文頁會出現空白", () => {
    for (const d of DRIVE_TIMES) {
      expect(d.from.trim().length).toBeGreaterThan(0);
      expect(d.fromEn.trim().length).toBeGreaterThan(0);
    }
  });

  it("路況要講明轎車可以——山路焦慮是勸退主因，不能只說「開車可到」", () => {
    expect(ROAD_NOTE).toContain("轎車");
    expect(ROAD_NOTE_EN.toLowerCase()).toContain("ordinary car");
  });

  it("沒開車的交通照業主原話：梅山站搭到橫山站、上下山車次要查好、機車可以直接到茶居（§2.12）", () => {
    for (const word of ["梅山站", "橫山站", "車次", "機車", "信淳茶居"]) {
      expect(NO_CAR_NOTE).toContain(word);
    }
    expect(NO_CAR_NOTE_EN).toContain("Hengshan");
    expect(NO_CAR_NOTE_EN.toLowerCase()).toContain("scooter");
  });

  it("兩段步行各自寫出起訖點：橫山站→停車場 20 到 24 分鐘、停車場→茶居 3 到 5 分鐘（業主 2026-09-24 糾正）", () => {
    // 第一版只寫「走到停車場，茶居就在旁邊（走路 3 到 5 分鐘）」，讀起來像下車走 3 到 5 分鐘就到
    expect(NO_CAR_NOTE).toMatch(/從橫山站走到[^。]*停車場大約 20 到 24 分鐘/);
    expect(NO_CAR_NOTE).toMatch(/再走 3 到 5 分鐘就到信淳茶居/);
    expect(NO_CAR_NOTE_EN).toContain("20 to 24 minute walk");
  });

  it("沒開車那段不寫業主沒給的數字——路線編號、班次都是猜的", () => {
    // 允許的數字只有業主給過的兩段步行時間（§2.4、§2.12）與回程提醒的「20 多分鐘」
    const rest = NO_CAR_NOTE
      .replace("20 到 24 分鐘", "")
      .replace("3 到 5 分鐘", "")
      .replace("20 多分鐘", "");
    expect(rest.match(/\d+/g) ?? []).toEqual([]);
  });

  it("地址與 email 樣板用的是同一個", () => {
    expect(read("src/lib/email.ts")).toContain(STREET_ADDRESS);
  });
});

describe("攻略文的插入位置", () => {
  it("掛在「在哪裡看？停車怎麼停？要花錢嗎？」之後", () => {
    expect(showsDirectionsAfter("cattle-egret-viewing-guide", "在哪裡看？停車怎麼停？要花錢嗎？")).toBe(true);
  });

  it("別的小標不插入——一篇文章只出現一次", () => {
    for (const h of ["想拍照的話", "有洗手間嗎？可以待多久？", "這件事是怎麼開始的"]) {
      expect(showsDirectionsAfter("cattle-egret-viewing-guide", h)).toBe(false);
    }
  });

  it("空字串與未設定的文章都回 false，不會壞頁面", () => {
    expect(showsDirectionsAfter("cattle-egret-viewing-guide", "")).toBe(false);
    expect(showsDirectionsAfter("alishan-tea", "在哪裡看？停車怎麼停？要花錢嗎？")).toBe(false);
  });
});

describe("visit 命名空間的中英文鍵值", () => {
  const visit = (locale: string) =>
    (JSON.parse(read(`messages/${locale}.json`)) as Record<string, Record<string, string>>).visit;

  it("兩種語言的鍵完全對得上", () => {
    expect(Object.keys(visit("zh")).sort()).toEqual(Object.keys(visit("en")).sort());
  });

  it("帶參數的字串兩邊參數一致——打錯會把大括號直接印在畫面上", () => {
    expect(visit("zh").navigateTo).toContain("{place}");
    expect(visit("en").navigateTo).toContain("{place}");
    expect(visit("zh").driveMinutes).toContain("{minutes}");
    expect(visit("en").driveMinutes).toContain("{minutes}");
  });
});
