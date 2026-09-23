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
  /** 精簡版的按鈕標籤。按鈕文字是我們自己的文案，導航連結帶的是座標，
   *  縮短不影響目的地正確性——但完整名稱在窄螢幕會折行 */
  shortName:   string;
  shortNameEn: string;
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
  name:        "信淳茶居",
  nameEn:      "Xinchun Tea House",
  shortName:   "信淳茶居",
  shortNameEn: "Xinchun Tea House",
  // 兩顆按鈕並排時，差別要一眼看得出來：停車場那邊沒有的，就是這邊有的（業主 2026-09-23：
  // 要把停在免費停車場的客人也吸引到茶居）。只寫設施事實，不寫評價
  forWho:   "有洗手間與座位・導覽集合點",
  forWhoEn: "Toilets and seating · tour meeting point",
  lat:      23.5537537,
  lng:      120.6324229,
  placeUrl: "https://maps.app.goo.gl/CcCb82auLo4VK3J88",
};

/** 免費賞鳥、沒有洗手間與座位；茶居 7 個車位停滿時停這裡（攻略文與導航說明都只帶過它，§2.11） */
export const VIEWING_PLATFORM: VenueDestination = {
  name:        "梅山太興村賞黃頭鷺景觀平台停車場",
  nameEn:      "Cattle Egret Viewing Platform Car Park",
  shortName:   "景觀平台停車場",
  shortNameEn: "Viewing platform car park",
  forWho:   "免費・沒有洗手間與座位",
  forWhoEn: "Free · no toilets or seating",
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

/**
 * 路況。山路焦慮是真的，這一句消掉的猶豫比任何文案都多。
 *
 * 「經太平 36 彎」是業主確認的路線（2026-09-23）。寫出路名是因為「萬鷺朝鳳路線」
 * 是 Google 自動完成的第 2 名，全站原本沒有一個字回答它。
 * 傍晚那句：看完鳥大約 6 點，秋天天暗得快，下山剛好就是彎道那一段
 */
export const ROAD_NOTE =
  "從梅山交流道上山會經過太平的 36 彎。彎多，但全程柏油路，一般轎車就可以直接開到門口，不需要四輪傳動；會車也不困難。" +
  "看完鳥大約傍晚 6 點，這個季節天暗得快，下山的彎道請慢慢開。";
/** 精簡版用。體驗頁的讀者已經在看這款要不要訂，只需要一句「開得上去」 */
export const ROAD_NOTE_SHORT    = "全程柏油路，汽機車都可到；沒開車可搭公車到橫山站";
export const ROAD_NOTE_SHORT_EN = "Sealed road all the way, fine by car or scooter; no car? Bus to Hengshan stop";

/**
 * 沒有開車的人怎麼來。業主原話（2026-09-23，owner-source-quotes §2.12）：
 * 搭公車梅山站到橫山站、步行到觀景平台、要看好上下山車次；機車比汽車好停、歡迎直接到茶居。
 *
 * 為什麼要寫：GSC 出現 Google AI 模式的追問「有接駁車」「騎機車」「大眾運輸」，攻略文原本沒答。
 * 路線編號、班次數、步行時間都**沒有**寫——業主沒給，官方時刻表也沒查到，寫了就是猜的。
 * 「傍晚」那句是給搭公車的人：鳥最好看的時段接近末班車，回程沒查好會被困在山上
 */
export const NO_CAR_NOTE =
  "沒有開車也可以來：搭公車從梅山站坐到橫山站下車，再走到賞鳥的景觀平台停車場，信淳茶居就在旁邊（走路 3 到 5 分鐘）。" +
  "鳥最壯觀是傍晚，上山和下山的車次都要先查好。騎機車更方便，比汽車好停，歡迎直接騎到信淳茶居。";

export const NO_CAR_NOTE_EN =
  "No car? Take the bus from Meishan station to Hengshan stop, then walk to the viewing platform car park — Xinchun Tea House is right next to it, a 3 to 5 minute walk. " +
  "The birds are best towards dusk, so check the bus times both up and back down before you set out. A scooter is even easier: much simpler to park than a car, and you are welcome to ride straight to Xinchun Tea House.";

export const ROAD_NOTE_EN =
  "From Meishan Interchange the road climbs through the 36 bends at Taiping. Plenty of curves, but sealed the whole way: an ordinary car gets you to the door — no 4WD needed, and passing oncoming traffic is not a problem. " +
  "The birds wind down around 6pm and it gets dark quickly in autumn, so take the bends slowly on the way down.";

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
