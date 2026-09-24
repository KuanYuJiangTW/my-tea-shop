#!/usr/bin/env node
/**
 * 對照 Sanity 上的 webhook 設定，確認「發布內容 → 前台換新」這條路是通的。
 *
 * 為什麼需要這支：webhook 的失效是**無聲**的。filter 沒涵蓋某個型別時，
 * Sanity 連一次投遞都不會產生，manage 後台的 attempts 是空的而不是紅的；
 * 前台看起來也正常，只是內容舊了最多一小時。2026-09-05 就是這樣被發現的——
 * 文章發布後六分鐘還是舊文案，回頭查才知道 filter 只寫了 experience。
 *
 * 檢查三件事：
 *   1. hook 的 filter 有涵蓋 SANITY_QUERIED_TYPES 的每一個型別
 *   2. trigger 有含 create / update / delete（只有 update 的話，新文件第一次
 *      發布不會觸發；沒有 delete 的話，刪掉的內容會留在前台）
 *   3. 最近的投遞沒有失敗（secret 對不上會是 401）
 *
 * 用法：
 *   npm run check:sanity-hook
 * token 取用順序：$SANITY_AUTH_TOKEN → Sanity CLI 的登入設定
 * （~/.config/sanity/config.json，即 `npx sanity login` 存的那個）。
 * 這支只做 GET，不會改到任何正式設定。
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOOK_API_VERSION = "v2025-08-04";   // 與 @sanity/cli 的 HOOK_API_VERSION 一致
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "c3ywhvej";
const WEBHOOK_PATH = "/api/sanity-webhook";
const RECENT_ATTEMPTS = 20;

// 與 src/sanity/queries.ts 的 SANITY_QUERIED_TYPES 同步（那邊有測試釘住）
const REQUIRED_TYPES = ["article", "experience", "faq"];
const REQUIRED_TRIGGERS = ["create", "update", "delete"];

function readToken() {
  if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN;
  try {
    const cfg = JSON.parse(
      readFileSync(join(homedir(), ".config", "sanity", "config.json"), "utf8"),
    );
    if (cfg.authToken) return cfg.authToken;
  } catch {
    /* 落到呼叫端的錯誤訊息 */
  }
  return null;
}

async function api(token, path) {
  const res = await fetch(`https://api.sanity.io/${HOOK_API_VERSION}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

/**
 * 從 GROQ filter 抽出它限定的 _type 字面值。
 *
 * 刻意的啟發式而非完整 GROQ parser：看不懂的寫法一律回 null（＝當成「涵蓋
 * 全部」而不誤報）。會漏報、不會誤報——誤報幾次之後就沒人看了。
 */
function typesInFilter(filter) {
  if (!filter || !filter.trim()) return null;          // 沒有 filter＝全部型別
  if (!/\b_type\b/.test(filter)) return null;          // 沒限制型別
  const literals = [...filter.matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
  return literals.length > 0 ? literals : null;
}

async function main() {
  const problems = [];
  const notes = [];

  const token = readToken();
  if (!token) {
    console.error("找不到 Sanity token。設 $SANITY_AUTH_TOKEN，或先跑 `npx sanity login`。");
    return 2;
  }

  const hooks = await api(token, `/hooks/projects/${PROJECT_ID}`);
  const ours = hooks.filter(h => (h.url ?? "").includes(WEBHOOK_PATH));

  if (ours.length === 0) {
    problems.push(`專案 ${PROJECT_ID} 上找不到指向 ${WEBHOOK_PATH} 的 webhook。發布內容不會清前台快取。`);
  }

  for (const hook of ours) {
    const label = `hook「${hook.name}」(${hook.id})`;

    if (hook.isDisabled || hook.isDisabledByUser) {
      problems.push(`${label} 被停用。`);
    }

    const rule = hook.rule ?? {};
    const filter = rule.filter ?? hook.filter;
    const limited = typesInFilter(filter);
    if (limited) {
      const missing = REQUIRED_TYPES.filter(t => !limited.includes(t));
      if (missing.length > 0) {
        problems.push(
          `${label} 的 filter 只涵蓋 [${limited.join(", ")}]，漏了 [${missing.join(", ")}]。` +
          `這些型別發布時不會送出 webhook，前台要等 revalidate 到期才換。\n` +
          `      目前 filter：${filter}`,
        );
      }
    } else {
      notes.push(`${label} 沒有型別限制的 filter（涵蓋全部型別）。`);
    }

    const on = rule.on ?? [];
    const missingTriggers = REQUIRED_TRIGGERS.filter(t => !on.includes(t));
    if (missingTriggers.length > 0) {
      problems.push(
        `${label} 的 trigger 是 [${on.join(", ") || "無"}]，缺 [${missingTriggers.join(", ")}]。` +
        `缺 create 時新文件第一次發布不會觸發；缺 delete 時刪掉的內容會留在前台。`,
      );
    }

    const attempts = await api(token, `/hooks/projects/${PROJECT_ID}/${hook.id}/attempts`);
    const recent = attempts.slice(0, RECENT_ATTEMPTS);
    const failures = recent.filter(a => a.isFailure || (a.resultCode && a.resultCode >= 400));
    if (failures.length > 0) {
      const f = failures[0];
      problems.push(
        `${label} 最近 ${recent.length} 次投遞有 ${failures.length} 次失敗，` +
        `最新一次 ${f.createdAt} → HTTP ${f.resultCode}${f.failureReason ? ` (${f.failureReason})` : ""}。\n` +
        `      401 通常代表 Sanity hook 的 secret 與 Vercel 的 SANITY_WEBHOOK_SECRET 對不上。`,
      );
    } else if (recent.length > 0) {
      notes.push(`${label} 最近一次投遞 ${recent[0].createdAt} → HTTP ${recent[0].resultCode}。`);
    } else {
      notes.push(`${label} 沒有任何投遞紀錄。`);
    }
  }

  for (const n of notes) console.log("  ·", n);

  if (problems.length > 0) {
    console.error(`\n✗ Sanity webhook 設定有 ${problems.length} 個問題：\n`);
    problems.forEach((p, i) => console.error(`  ${i + 1}. ${p}\n`));
    return 1;
  }

  console.log(`\n✓ Sanity webhook 設定正常（涵蓋 ${REQUIRED_TYPES.join("／")}，投遞無失敗）`);
  return 0;
}

// 用 process.exitCode 而不是 process.exit()：Windows 上 undici 還有連線在關閉中時
// 直接 exit 會踩到 libuv 的 assert，退出碼變成 127，CI 看到的就不是 1 了。
process.exitCode = await main();
