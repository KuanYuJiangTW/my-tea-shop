// 攻略文「在哪裡看？停車怎麼停？」第 1 段：「車子直接開到門口」改成「平日」才成立（業主 2026-09-27 同意）。
// 假日停滿時路口會擋起來，沒預約的車開不到門口（owner-source-quotes §2.14）。
//
// 一次性腳本：寫進 Sanity 就是直接上線。預設空跑（--apply 才寫入）、舊文逐字比對不符就中止、ifRevisionID 鎖版本。
// 用法（在 repo 根目錄）：node scripts/sanity-egret-door-access.mjs [--apply]；寫入完成後本檔可刪。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const APPLY = process.argv.includes("--apply");
const env = readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
const TOKEN = env.match(/^SANITY_API_WRITE_TOKEN=(.*)$/m)[1].replace(/"/g, "").trim();
const BASE = "https://c3ywhvej.api.sanity.io/v2025-08-04/data";
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const ID = "article-cattle-egret-viewing-guide";

const OLD_ZH = "看萬鷺朝鳳，我們建議坐在信淳茶居等。車子直接開到門口，不必先走一段山路，帶嬰兒車或長輩來都沒問題；有遮蔭座位、有洗手間，從座位看出去就是鳥群通過的溪谷，視野絕佳。";
const OLD_EN = "For the Ten Thousand Egrets, we suggest waiting at Xinchun Tea House. You drive right up to the door — no trail to walk first, so strollers and older visitors are fine — and there is shaded seating, toilets, and a superb view straight out over the valley the flock crosses.";
const NEW_ZH = "看萬鷺朝鳳，我們建議坐在信淳茶居等。平日車子直接開到門口，不必先走一段山路，帶嬰兒車或長輩來都沒問題（假日怎麼停，請看下面）；有遮蔭座位、有洗手間，從座位看出去就是鳥群通過的溪谷，視野絕佳。";
const NEW_EN = "For the Ten Thousand Egrets, we suggest waiting at Xinchun Tea House. On weekdays you drive right up to the door — no trail to walk first, so strollers and older visitors are fine (for weekends and public holidays, see parking below) — and there is shaded seating, toilets, and a superb view straight out over the valley the flock crosses.";

const q = encodeURIComponent(`*[_id == "${ID}"][0]`);
const doc = (await (await fetch(`${BASE}/query/production?query=${q}&perspective=raw`, { headers: H })).json()).result;
const s3 = doc.sections.find(s => s._key === "s3");
if (s3.paragraphs[0] !== OLD_ZH || s3.paragraphsEn[0] !== OLD_EN) {
  console.error("✗ 舊文不符（有人先改過），中止");
} else if (!APPLY) {
  console.log(`article rev ${doc._rev}；s3 第 1 段中英舊文逐字相符 ✓
（空跑，未寫入。加 --apply 寫入）`);
} else {
  const mutations = [{ patch: { id: ID, ifRevisionID: doc._rev, set: {
    'sections[_key=="s3"].paragraphs[0]': NEW_ZH, 'sections[_key=="s3"].paragraphsEn[0]': NEW_EN,
  } } }];
  const r = await fetch(`${BASE}/mutate/production?returnIds=true&visibility=sync`, { method: "POST", headers: H, body: JSON.stringify({ mutations }) });
  console.log("HTTP", r.status, JSON.stringify(await r.json()));
}
