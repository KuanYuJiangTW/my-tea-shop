/**
 * 賞鳥的兩個地點與交通資訊。
 *
 * 為什麼要有這個檔（2026-08-31）：業主回報「很多客人在網路上找到文章後不知道
 * 怎麼來」。查下去發現**全站沒有任何一個地圖或導航連結**——地址只出現在 email
 * 與 JSON-LD 裡，頁面上沒有可以點的東西。客人不是資訊看不懂，是根本沒有給路。
 *
 * 這些事實會同時出現在體驗頁與攻略文，所以集中在這裡。兩邊各寫一份的話，
 * 遲早只有一邊被更新——本 repo 已經因為這樣讓「導覽 250 元」在 llms.txt 裡
 * 躺了很久（見 lessons）。
 *
 * 座標取自業主提供的 Google 地圖分享連結（`maps.app.goo.gl`）解析後的
 * `!8m2!3d<lat>!4d<lng>`，那是地點本身的座標，不是當時的地圖視野中心。
 */

export interface VenueDestination {
  /** 對應 Google 地圖上的地點名稱 */
  name:   string;
  nameEn: string;
  /** 這個地點是給哪一種客人的 */
  forWho:   string;
  forWhoEn: string;
  lat: number;
  lng: number;
  /** 業主提供的分享連結，點了會開地點頁（有照片與評論，比純座標更有信心） */
  placeUrl: string;
}

/** 主要集合點：茶位與導覽都在這裡，停車費含在入園費裡 */
export const TEA_HOUSE: VenueDestination = {
  name:     "信淳茶居",
  nameEn:   "Xinchun Tea House",
  forWho:   "看鳥茶位・導覽集合點",
  forWhoEn: "Tea seat & tour meeting point",
  lat:      23.5537537,
  lng:      120.6324229,
  placeUrl: "https://maps.app.goo.gl/CcCb82auLo4VK3J88",
};

/** 免費賞鳥；也是茶居 7 個車位停滿時的備案 */
export const VIEWING_PLATFORM: VenueDestination = {
  name:     "梅山太興村賞黃頭鷺景觀平台停車場",
  nameEn:   "Cattle Egret Viewing Platform Car Park",
  forWho:   "免費賞鳥・茶居車位停滿時的備案",
  forWhoEn: "Free viewing, and the overflow when the tea house is full",
  lat:      23.553223,
  lng:      120.632091,
  placeUrl: "https://maps.app.goo.gl/hEcSc69WydcHouLD9",
};

export const STREET_ADDRESS    = "嘉義縣梅山鄉太興村8鄰溪頭19號之2";
export const STREET_ADDRESS_EN = "No. 19-2, Xitou, Taixing Village, Meishan Township, Chiayi County";

export interface DriveTime {
  from:     string;
  fromEn:   string;
  /** 分鐘。只寫業主實際開過的時間，不用地圖估算值 */
  minutes:  number;
}

/**
 * 車程。全部由業主提供（2026-08-31），不是 Google 的估算——
 * 山路的估算值常常比實際樂觀，而「說好 40 分鐘結果開了一小時」會直接毀掉當天的心情。
 */
export const DRIVE_TIMES: DriveTime[] = [
  { from: "梅山交流道",   fromEn: "Meishan Interchange",      minutes: 44 },
  { from: "嘉義市區",     fromEn: "Chiayi City",              minutes: 60 },
  { from: "高鐵嘉義站",   fromEn: "THSR Chiayi Station",      minutes: 70 },
];

/** 路況。山路焦慮是真的，這一句消掉的猶豫比任何文案都多 */
export const ROAD_NOTE =
  "全程柏油路，一般轎車就可以直接開到門口，不需要四輪傳動；會車也不困難。";
export const ROAD_NOTE_EN =
  "Sealed road the whole way. An ordinary car gets you to the door — no 4WD needed, and passing oncoming traffic is not a problem.";

/**
 * Google 地圖的通用導航連結。
 *
 * 用座標而不是地點名稱：名稱在山區有機會被解析到別的地方，而座標不會。
 * 客人在我們的按鈕上看到的是地點名稱，Google 收到的是精確座標，兩邊都對。
 * `api=1` 是官方的通用格式，手機上會直接開 Google 地圖 App，桌機開網頁版。
 */
export function directionsUrl(d: VenueDestination): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${d.lat}%2C${d.lng}`;
}
