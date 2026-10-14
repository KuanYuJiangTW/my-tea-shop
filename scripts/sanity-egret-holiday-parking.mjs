// 萬鷺朝鳳假日停車文案（owner-source-quotes §2.14）——業主 2026-09-27 逐字核准的定稿。
//
// 一次性腳本：寫進 Sanity 就是直接上線（繞過 PR 審閱），所以做成三道保險：
//   1. 預設只空跑；加 --apply 才寫入
//   2. 10 處舊文案逐字比對，有任何一處不符（有人先改過）就中止、什麼都不寫
//   3. ifRevisionID 鎖版本，比對後到寫入前若有人改過文件，Sanity 會拒絕整筆
// 用法（在 repo 根目錄）：node scripts/sanity-egret-holiday-parking.mjs [--apply]
// 寫入完成後本檔可刪；定稿文字同時是這次變更的紀錄。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const APPLY = process.argv.includes("--apply");
const env = readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
const TOKEN = env.match(/^SANITY_API_WRITE_TOKEN=(.*)$/m)[1].replace(/["\r]/g, "").trim();
const BASE = "https://c3ywhvej.api.sanity.io/v2025-08-04/data";
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

const ARTICLE = "article-cattle-egret-viewing-guide";
const EXP = "41af4b37-91f6-43e3-9745-bacd89b10bd7";

async function get(id) {
  const q = encodeURIComponent(`*[_id == "${id}"][0]`);
  const r = await fetch(`${BASE}/query/production?query=${q}&perspective=raw`, { headers: H });
  return (await r.json()).result;
}

// ── 新文案 ─────────────────────────────────────────────
const A1 = "參加導覽：一樣開到信淳茶居，那裡就是集合點，停車免費（已經含在導覽費裡）。";
const A1en = "Booked the tour: drive to Xinchun Tea House as well — that is the meeting point, and parking is already covered by your tour fee.";
const A2 = "平日停車沒問題；假日和連假，請先有停路邊的準備。茶居門口只有 7 個車位，還有幾格要留給預約導覽的客人。來看鳥的人多半下午 2 點過後一起進來、6 點左右一起離開，所以賞鳥季的週末和連假很快就停滿，旁邊的景觀平台停車場也可能客滿；想停茶居，2 點前到比較有機會。茶居停滿時，我們會把路口擋起來——看到路口擋住，請直接在附近路邊的白線範圍內找位子停好，再走路進來；紅線、黃線不要停，也別擋到住家和農路的出入口。";
const A2en = "On weekdays parking is no problem; at weekends and on public holidays, plan on parking by the roadside. The tea house has only seven spaces, and some are held for guests on the guided tour. Most visitors arrive after 2pm and leave together around 6pm, so on egret-season weekends and long weekends the spaces go quickly, and the viewing platform car park next door may be full too; arrive before 2pm for the best chance of a space at the tea house. Once the tea house is full we block off the entrance — if you find it blocked, park along the white-lined roadside nearby and walk in. Please don't park on red or yellow lines, and keep clear of house and farm-track entrances.";
const A3 = "帶長輩、小孩或推嬰兒車的話，可以先在路口讓人下車，走進來大約 1 到 2 分鐘，駕駛再去停車。幾個人一起來盡量共乘，騎機車也好停很多。6 點大家一起離開時天已經暗了，停在路邊的話，走回車上請靠邊、留意來車。停車有任何問題，出發前或到了現場都可以打 0972-619-391 問我們。";
const A3en = "With older relatives, children or a stroller, let them out at the entrance first — it is a one to two minute walk in — then go and park. Share cars if you can; a scooter is far easier to park. When everyone leaves around 6pm it is already getting dark, so if you parked on the roadside, keep to the edge and watch for cars on the walk back. Any parking questions, before you set out or once you are here, call us on 0972-619-391.";
const B = "還有一件比解說本身更實際的事：導覽是預約制，座位和車位都是留給你的。賞鳥季的假日和連假，看鳥的車子下午 2 點過後會一起進來，茶居的 7 個車位很快就滿——預約導覽的客人，我們會先幫你留車位。預約後請打個電話告訴我們開幾台車，怎麼進來停，我們會在電話裡跟你說。";
const Ben = "One thing that matters more than the talk itself: the tour is booked ahead, so your seat and your parking space are both held. On egret-season weekends and long weekends the cars all arrive after 2pm and the tea house's seven spaces fill fast — for tour guests we keep spaces aside. After booking, give us a call to say how many cars you are bringing, and we will tell you how to get in and park.";
const C = "不用預約，直接開到信淳茶居就可以。平日停車沒問題；不過茶居只有 7 個車位，賞鳥季的假日和連假請先有停路邊的準備：看到路口擋起來就是停滿了，怎麼停請看上面「在哪裡看？停車怎麼停？」那一段。停車有問題隨時打電話問我們。";
const Cen = "No booking needed — just drive up to Xinchun Tea House. Parking is no problem on weekdays, but the tea house has only seven spaces, so on egret-season weekends and long weekends plan on parking by the roadside: if the entrance is blocked off, it is full — see \"where do you park\" above. Call us any time with parking questions.";
const D = "參加導覽免費停車，預約的客人我們會保留車位：預約後請來電 0972-619-391 告知開幾台車，怎麼進來停會在電話裡說明。茶居只有約 7 個車位，賞鳥季的假日和連假下午很快停滿，停滿時路口會擋起來";
const Den = "Free parking for tour guests, with spaces held for you: after booking, call 0972-619-391 to tell us how many cars, and we will explain how to get in and park. The tea house has only about 7 spaces; on egret-season weekends and long weekends they fill quickly in the afternoon, after which the entrance is blocked off";
const E = "停車免費（導覽客人保留車位；現場有洗手間）";
const Een = "Free parking (spaces held for tour guests; toilets on site)";

// ── 舊文案（逐字比對，不符就中止）────────────────────────
const OLD = {
  s3p2:   "參加導覽：一樣開到信淳茶居，那裡就是集合點，停車免費（已經含在導覽費裡）。茶居這邊大約 7 個車位，賞鳥旺季的假日可能會停滿，停滿時停旁邊的景觀平台停車場或附近路邊都可以。",
  s3p2en: "Booked the tour: drive to Xinchun Tea House as well — that is the meeting point, and parking is already covered by your tour fee. The tea house has about seven spaces and can fill up on peak-season weekends; when it does, use the viewing platform car park next door or the roadside nearby.",
  s6p3:   "還有一件比解說本身更實際的事：導覽是預約制，位子是留給你的。賞鳥旺季的週末，茶居的 7 個車位中午前就可能停滿，座位也是。預約了就不必碰運氣。",
  s6p3en: "One thing that matters more than the talk itself: the tour is booked ahead, so your seat is held. On peak-season weekends the seven parking spaces at the tea house can fill before noon, and so can the seating. Booking means not leaving it to chance.",
  s7p0:   "不用預約，直接開到信淳茶居門口就可以，我們有 7 個車位。",
  s7p0en: "No booking needed — just drive up to Xinchun Tea House. We have seven parking spaces at the door.",
  n1:     "參加活動免費停車。信淳茶居約 7 個車位，賞鳥旺季的假日可能停滿；停滿時可停「黃頭鷺停車場」或附近路邊",
  n1en:   "Free parking for tour guests. About 7 spaces at the tea house; it can fill up on peak-season weekends, with overflow parking at the Cattle Egret Car Park and along the nearby roadside",
  i5:     "停車免費（7 個車位，現場有洗手間）",
  i5en:   "Free parking (7 spaces, toilets on site)",
};

function expect(actual, key) {
  if (actual !== OLD[key]) {
    console.error(`✗ ${key} 與預期舊文案不符，中止。\n  實際：${actual}`);
    process.exit(1);
  }
}

const art = await get(ARTICLE);
const exp = await get(EXP);
const sec = k => art.sections.find(s => s._key === k);
const s3 = sec("s3"), s6 = sec("s6"), s7 = sec("s7");

expect(s3.paragraphs[2], "s3p2");   expect(s3.paragraphsEn[2], "s3p2en");
expect(s6.paragraphs[3], "s6p3");   expect(s6.paragraphsEn[3], "s6p3en");
expect(s7.paragraphs[0], "s7p0");   expect(s7.paragraphsEn[0], "s7p0en");
expect(exp.notes[1], "n1");         expect(exp.notesEn[1], "n1en");
expect(exp.includes[5], "i5");      expect(exp.includesEn[5], "i5en");
if (s3.paragraphs.length !== s3.paragraphsEn.length) throw new Error("s3 中英段數不一致");

const splice = (arr, i, del, ...ins) => { const a = [...arr]; a.splice(i, del, ...ins); return a; };
const s3zh = splice(s3.paragraphs,   2, 1, A1, A2, A3);
const s3en = splice(s3.paragraphsEn, 2, 1, A1en, A2en, A3en);
const s6zh = splice(s6.paragraphs,   3, 1, B);
const s6en = splice(s6.paragraphsEn, 3, 1, Ben);
const s7zh = splice(s7.paragraphs,   0, 1, C);
const s7en = splice(s7.paragraphsEn, 0, 1, Cen);

const mutations = [
  { patch: { id: ARTICLE, ifRevisionID: art._rev, set: {
    'sections[_key=="s3"].paragraphs':   s3zh,
    'sections[_key=="s3"].paragraphsEn': s3en,
    'sections[_key=="s6"].paragraphs':   s6zh,
    'sections[_key=="s6"].paragraphsEn': s6en,
    'sections[_key=="s7"].paragraphs':   s7zh,
    'sections[_key=="s7"].paragraphsEn': s7en,
    updatedAt: "2026-09-27T04:00:00.000Z",
  } } },
  { patch: { id: EXP, ifRevisionID: exp._rev, set: {
    "notes[1]": D, "notesEn[1]": Den, "includes[5]": E, "includesEn[5]": Een,
  } } },
];

console.log(`article rev ${art._rev}；experience rev ${exp._rev}`);
console.log(`s3 段數 ${s3.paragraphs.length} → ${s3zh.length}（中）／${s3en.length}（英）`);
console.log("舊文案 10 處逐字相符 ✓");
if (!APPLY) { console.log("（空跑，未寫入。加 --apply 寫入）"); process.exit(0); }

const r = await fetch(`${BASE}/mutate/production?returnIds=true&visibility=sync`, {
  method: "POST", headers: H, body: JSON.stringify({ mutations }),
});
console.log("HTTP", r.status, JSON.stringify(await r.json()));
