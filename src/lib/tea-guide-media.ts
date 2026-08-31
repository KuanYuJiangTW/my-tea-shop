/**
 * 攻略文的圖片與影片版位。
 *
 * 為什麼放在程式碼而不是 Sanity（2026-08-30）：
 * article schema 的 section 物件目前只有 heading／paragraphs，沒有圖片欄位。
 * 要讓小編從 Studio 掛圖，得改 schema、改 GROQ、再逐篇上傳——那是對的長期做法，
 * 但它有個現在不能接受的副作用：**Sanity 內容一寫入就直接上線**，繞過 PR 審閱。
 * 業主要求第二批做完一起開 PR 審過再上，所以這一批把「哪張圖放哪一段」留在程式碼裡，
 * 圖檔放 public/，整批都在同一個 PR 裡可審、可回退。
 *
 * 之後要遷移到 Sanity 不難：把下面的 SECTION_MEDIA 當成初始內容灌進去即可。
 *
 * 對應鍵是**中文小標原文**（不是翻譯後的），所以中英文頁共用同一份設定。
 * 小標若在 Sanity 被改動，這裡查不到就是不顯示圖，不會壞頁面。
 */

export interface ArticleImage {
  src:   string;
  alt:   string;
  altEn: string;
  /** 圖說。留空就不顯示 */
  caption?:   string;
  captionEn?: string;
}

export interface ArticleHeroVideo {
  src:    string;
  poster: string;
  alt:    string;
  altEn:  string;
  caption?:   string;
  captionEn?: string;
}

/** slug → 首屏影片 */
const HERO_VIDEO: Record<string, ArticleHeroVideo> = {
  "cattle-egret-viewing-guide": {
    src:    "/videos/egret-flock.mp4",
    poster: "/images/tea-guide/egret-flock-poster.jpg",
    alt:    "成群黃頭鷺聚成一片白色鳥群，飛越嘉義梅山太興村的溪谷山壁",
    altEn:  "A dense flock of cattle egrets crossing the forested valley above Taixing, Meishan",
    caption:   "下午三點後的溪谷——這是從信淳茶居的座位看出去的樣子。",
    captionEn: "Past three in the afternoon, seen from the seats at our tea house.",
  },
};

/** slug → 中文小標 → 該段落末尾要放的圖 */
const SECTION_MEDIA: Record<string, Record<string, ArticleImage>> = {
  "cattle-egret-viewing-guide": {
    "為什麼叫「萬鷺朝鳳」？": {
      src:   "/images/tea-guide/egret-band.jpg",
      alt:   "黃頭鷺群被溪谷地形帶著走，拉成一條長帶橫越山谷",
      altEn: "The valley funnels the egrets into a single long band crossing the mountainside",
      caption:   "溪谷把鳥群帶成一條帶狀通過，而不是散開來各飛各的。",
      captionEn: "The valley gathers them into one moving band instead of scattering them.",
    },
    "在哪裡看？停車怎麼停？要花錢嗎？": {
      src:   "/images/tea-guide/parking.jpg",
      alt:   "信淳茶居門口的停車空地，停著數台轎車，右側是看鳥的座位區與山谷",
      altEn: "The parking apron at our tea house, with cars parked and the viewing terrace to the right",
      caption:   "車子可以直接開到門口，不必先走一段山路。",
      captionEn: "You can drive right up to the door — no walk in from the road.",
    },
    "有洗手間嗎？可以待多久？": {
      src:   "/images/tea-guide/seating.jpg",
      alt:   "遮陽傘下的座位區，有桌椅、電風扇，遊客坐著與站著等待鳥群",
      altEn: "Shaded seating with tables, chairs and a fan, where visitors wait for the flock",
      caption:   "傘、椅子、電風扇——賞鳥要等兩三個小時，這些是為了那兩三個小時準備的。",
      captionEn: "Umbrellas, chairs, a fan — the wait is two or three hours, and it is set up for that.",
    },
    "想拍照的話": {
      src:   "/images/tea-guide/photographers.jpg",
      alt:   "一整排遊客沿著矮牆望向山谷拍照，視野開闊沒有電線橫過",
      altEn: "Visitors lined along the low wall photographing the valley, with no power lines in the view",
      caption:   "這個角度沒有電線橫過，長焦取景不必閃。",
      captionEn: "No power lines cross this view — nothing to dodge with a long lens.",
    },
  },
};

/**
 * slug → 要在哪個中文小標之後插入「怎麼來」。
 *
 * 業主回報客人「在網路上找到文章後不知道怎麼來」，而這篇的流量正是那批人。
 * 掛在「在哪裡看？停車怎麼停？要花錢嗎？」之後——問題就是在那一段產生的。
 */
const DIRECTIONS_AFTER: Record<string, string> = {
  "cattle-egret-viewing-guide": "在哪裡看？停車怎麼停？要花錢嗎？",
};

export function showsDirectionsAfter(slug: string, zhHeading: string): boolean {
  return Boolean(zhHeading) && DIRECTIONS_AFTER[slug] === zhHeading;
}

export function heroVideoFor(slug: string): ArticleHeroVideo | null {
  return HERO_VIDEO[slug] ?? null;
}

export function sectionImageFor(slug: string, zhHeading: string): ArticleImage | null {
  return SECTION_MEDIA[slug]?.[zhHeading] ?? null;
}
