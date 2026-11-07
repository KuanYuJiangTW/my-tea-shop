// 通用 FAQ「體驗地點在哪裡？如何前往？」改寫（owner-source-quotes §2.8、§2.12、§2.14，2026-09-27）。
//
// 一次性腳本：寫進 Sanity 就是直接上線。三道保險同 sanity-egret-holiday-parking.mjs：
//   預設空跑（--apply 才寫入）、舊文逐字比對不符就中止、ifRevisionID 鎖版本。
// 用法（在 repo 根目錄）：node scripts/sanity-faq-transport.mjs [--apply]
// 寫入完成後本檔可刪。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const APPLY = process.argv.includes("--apply");
const env = readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
const TOKEN = env.match(/^SANITY_API_WRITE_TOKEN=(.*)$/m)[1].replace(/["\r]/g, "").trim();
const BASE = "https://c3ywhvej.api.sanity.io/v2025-08-04/data";
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const ID = "f061ab4c-7e31-4168-b358-b3fb775e548e";

// 舊文（2026-09-27 從線上原樣取下，含行尾空白）
const OLD_ZH = "體驗地點在霧抉茶自家茶園——嘉義縣梅山鄉太興村8鄰溪頭19號之2，位於大阿里山茶區。Google 地圖搜尋「信淳茶居」即可導航。  \n\n自行開車：走台162甲線上山，現場停車方便，建議以開車前往為主。\n大眾運輸：搭乘公車至梅山，再轉乘當地接駁前往茶園。\n\n報名完成後的確認信會再附上詳細地址與導航資訊。接駁班次或其他交通需求，歡迎來電 0972-619-391 或加 LINE 官方帳號詢問。";
const OLD_EN = "Our tea garden is at No. 19-2, Xitou, Neighborhood 8, Taixing Village, Meishan Township, Chiayi County — in the Greater Alishan tea region. Search \"信淳茶居\" on Google Maps for navigation.\n\nBy car: take Provincial Highway 162A up the mountain. Parking is easy on site, and driving is the recommended option.\nBy public transport: take a bus to Meishan, then transfer to a local shuttle to the tea garden.\n\nDetailed directions are also included in your booking confirmation email. For shuttle schedules or other transport questions, call +886-972-619-391 or message us on LINE.";

// 新文：拿掉「轉乘當地接駁」（業主：沒有接駁）、「台162甲線」（162甲是縣道；改寫業主確認的兩條路）、
// 「現場停車方便」（賞鳥季假日不成立）、「導航資訊」（確認信只有地址）；補上業主 09-27 的路況：進太興村路窄要注意會車
const NEW_ZH = "體驗地點在霧抉茶自家茶園——嘉義縣梅山鄉太興村8鄰溪頭19號之2，位於大阿里山茶區。Google 地圖搜尋「信淳茶居」即可導航。\n\n自行開車：梅山交流道或竹崎交流道下，都有路可以上山。從梅山交流道上來約 44 分鐘，會經過太平的 36 彎，全程柏油路；進到太興村之後路比較窄，要注意會車。茶居有 7 個車位，平日停車沒問題；8 到 10 月賞鳥季的假日與連假，下午 2 點過後看鳥的車多，常常停滿，停滿時請停附近路邊白線再走進來（預約萬鷺朝鳳導覽的客人，我們會保留車位）。\n大眾運輸：沒有接駁車。搭公車從梅山站坐到橫山站下車，從橫山站走到賞鳥的景觀平台停車場約 20 到 24 分鐘，再走 3 到 5 分鐘到信淳茶居；上山和下山的車次請先查好。騎機車也可以，比汽車好停，歡迎直接騎到信淳茶居。\n\n報名完成後的確認信會附上詳細地址。其他交通問題，歡迎來電 0972-619-391 或加 LINE 官方帳號詢問。";
const NEW_EN = "Our tea garden is at No. 19-2, Xitou, Neighborhood 8, Taixing Village, Meishan Township, Chiayi County — in the Greater Alishan tea region. Search \"信淳茶居\" on Google Maps for navigation.\n\nBy car: you can come up from either Meishan Interchange or Zhuqi Interchange. From Meishan Interchange it is about 44 minutes, up through the 36 bends at Taiping on a sealed road; the road narrows once you reach Taixing Village, so watch for oncoming traffic. The tea house has seven parking spaces — no problem on weekdays, but on weekends and public holidays in the egret season (August to October) they often fill after 2pm, when birdwatchers arrive; if so, park on the white-lined roadside nearby and walk in. (Guests booked on the Ten Thousand Egrets tour have spaces held for them.)\nBy public transport: there is no shuttle. Take the bus from Meishan station to Hengshan stop, walk about 20 to 24 minutes to the viewing platform car park, then 3 to 5 more minutes to Xinchun Tea House; check bus times both up and back down before you set out. A scooter works too — much easier to park than a car, and you are welcome to ride straight to the tea house.\n\nYour booking confirmation email includes the full address. For any other transport questions, call +886-972-619-391 or message us on LINE.";

const q = encodeURIComponent(`*[_id == "${ID}"][0]`);
const doc = (await (await fetch(`${BASE}/query/production?query=${q}&perspective=raw`, { headers: H })).json()).result;
const shape = k => doc[k].length === 1 && doc[k][0].children.length === 1 && doc[k][0].children[0]._type === "span";
if (!shape("answer") || !shape("answer_en")) { console.error("✗ answer 結構不是單一區塊單一 span，中止"); process.exit(1); }
if (doc.answer[0].children[0].text !== OLD_ZH)    { console.error("✗ 中文舊文不符，中止"); process.exit(1); }
if (doc.answer_en[0].children[0].text !== OLD_EN) { console.error("✗ 英文舊文不符，中止"); process.exit(1); }
console.log(`FAQ rev ${doc._rev}；中英舊文逐字相符 ✓`);
// 空跑不呼叫 process.exit(0)：Windows 上 fetch 的連線還沒關就 exit 會觸發 libuv 斷言
if (!APPLY) {
  console.log("（空跑，未寫入。加 --apply 寫入）");
} else {
  const mutations = [{ patch: { id: ID, ifRevisionID: doc._rev, set: {
    "answer[0].children[0].text": NEW_ZH, "answer_en[0].children[0].text": NEW_EN,
  } } }];
  const r = await fetch(`${BASE}/mutate/production?returnIds=true&visibility=sync`, { method: "POST", headers: H, body: JSON.stringify({ mutations }) });
  console.log("HTTP", r.status, JSON.stringify(await r.json()));
}
