#!/usr/bin/env node
/**
 * 對正式站跑一組不變量檢查。純 fetch，不需要瀏覽器也不需要金鑰。
 *
 * 用法：
 *   node .claude/skills/deploy-check/scripts/check-live.mjs
 *   node .claude/skills/deploy-check/scripts/check-live.mjs --base https://preview-xxx.vercel.app
 *   node .claude/skills/deploy-check/scripts/check-live.mjs --expect "/tea-guide/egret::新標題"
 *
 * `--expect <路徑>::<必須出現的字串>` 可疊加多個，用來驗「這次改的東西真的上線了」——
 * 這是 `git push` 成功與「已部署」之間唯一可靠的橋（lessons.md 2026-08-17：
 * Vercel 曾漏接一次 webhook，安全修正在線上多躺 15 分鐘）。
 *
 * exit code：全過 0，有任何一項失敗 1。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKS = JSON.parse(readFileSync(join(HERE, "..", "checks.json"), "utf8"));

const args = process.argv.slice(2);
let base = CHECKS.base;
const extra = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--base") base = args[++i];
  else if (args[i] === "--expect") {
    const [path, ...rest] = args[++i].split("::");
    extra.push({ path, mustContain: [rest.join("::")], why: "本次改動應已上線" });
  }
}
base = base.replace(/\/$/, "");

/** 加隨機參數避開 CDN 快取——不加的話驗到的可能是舊版（WORKLOG 2026-07 的做法）。 */
const bust = (url) => url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now().toString(36);

const results = [];

async function check(c) {
  const url = base + c.path;
  const label = c.path;
  try {
    // 大型資產（影片、圖片）用 HEAD：GET 會把整個 body 下載完才回來。
    // 2026-08-31 實測，用 GET 抓 1.9GB 那支影片直接把整條檢查拖到逾時。
    const method = c.method ?? "GET";
    const res = await fetch(bust(url), {
      method,
      redirect: "follow",
      headers: { "cache-control": "no-cache", "user-agent": "deploy-check/1.0" },
    });

    const wantStatus = c.status ?? 200;
    if (res.status !== wantStatus) {
      return results.push({ label, ok: false, msg: `HTTP ${res.status}，預期 ${wantStatus}` });
    }
    if (method === "HEAD" || (!c.mustContain?.length && !c.mustNotContain?.length)) {
      return results.push({ label, ok: true, msg: `HTTP ${res.status}` });
    }

    const body = await res.text();
    const missing = (c.mustContain ?? []).filter((s) => !body.includes(s));
    const present = (c.mustNotContain ?? []).filter((s) => body.includes(s));

    if (missing.length || present.length) {
      const parts = [];
      if (missing.length) parts.push(`缺少「${missing.join("」「")}」`);
      if (present.length) parts.push(`不該出現卻出現「${present.join("」「")}」`);
      return results.push({ label, ok: false, msg: parts.join("；"), why: c.why });
    }
    results.push({ label, ok: true, msg: `HTTP ${res.status}，內容比對通過` });
  } catch (e) {
    results.push({ label, ok: false, msg: `請求失敗：${e.message}` });
  }
}

console.log(`檢查對象：${base}\n`);

// 序列跑而非併發：對正式站客氣一點，順序也讓輸出好讀
for (const c of [...CHECKS.checks, ...extra]) await check(c);

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.label} — ${r.msg}`);
  if (!r.ok) {
    failed++;
    if (r.why) console.log(`   為什麼重要：${r.why}`);
  }
}

console.log("");
if (failed) {
  console.log(`${failed} / ${results.length} 項未通過`);
  process.exit(1);
}
console.log(`全部 ${results.length} 項通過`);
