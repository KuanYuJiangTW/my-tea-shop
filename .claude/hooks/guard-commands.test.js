#!/usr/bin/env node
/**
 * guard-commands.js 的測試。跑法：node .claude/hooks/guard-commands.test.js
 *
 * 為什麼要有這支：guard 的失敗模式是雙向的——
 *   漏擋 → 危險指令跑掉（本來要防的事沒防到）
 *   誤擋 → 正常工作被卡住（人會直接把 guard 關掉，比沒有還糟）
 * 2026-07-29 這兩種都真的發生過：先是誤擋了說明自己的那筆 commit，
 * 接著誤擋了測試腳本自己。案例寫在檔案裡而非 shell 一行式，
 * 才不會又踩到「測試內容被自己的規則比對到」的元問題。
 */

const { execFileSync } = require("child_process");
const path = require("path");
const os = require("os");

const GUARD = path.join(__dirname, "guard-commands.js");
const { decide } = require("./guard-commands.js");

/**
 * 子行程跑法（驗完整的 stdin → stdout 合約）。
 * cwd 刻意指到非 git 目錄：否則 main 分支規則會去查「跑測試時剛好在哪個分支」，
 * 同一個案例在 main 上和在功能分支上結果不同——測試就飄了。
 * 分支相關的判定改用下面的 BRANCH_CASES 直接呼叫 decide()。
 */
function run(tool, command) {
  const out = execFileSync("node", [GUARD], {
    input: JSON.stringify({ tool_name: tool, tool_input: { command }, cwd: os.tmpdir() }),
    encoding: "utf8",
  });
  return out.trim().length > 0; // 有輸出 = 攔截
}

// PowerShell here-string 的字面片段，拆開拼接以免這個檔案自己觸發規則
const AT = "@";
const Q = "'";
const HERESTRING_COMMIT = `git commit -m ${AT}${Q}訊息${Q}${AT}`;

const CASES = [
  // [說明, tool, command, 應否攔截]
  ["npm audit fix --force", "Bash", "npm audit fix --force", true],
  ["npm audit fix 無 flag", "Bash", "npm audit fix", true],
  ["夾在複合指令中", "Bash", "cd x && npm  audit  fix && echo ok", true],
  ["PowerShell 也要擋", "PowerShell", "npm audit fix", true],
  ["Bash here-string commit", "Bash", HERESTRING_COMMIT, true],

  ["npm audit 唯讀", "Bash", "npm audit --json", false],
  ["npm run test", "Bash", "npm run test", false],
  ["npm install", "Bash", "npm install next@16.2.12", false],
  ["PowerShell here-string 合法", "PowerShell", HERESTRING_COMMIT, false],
  ["含 @ 的 email", "Bash", "echo a@b.com", false],
  ["無 command 的工具", "Read", "", false],

  // 誤擋防線：指令「提到」這些字串但沒有執行它們
  [
    "commit 訊息提到該指令",
    "Bash",
    `git commit -m "$(cat <<EOF\n攔截 npm audit fix 的理由\nEOF\n)"`,
    false,
  ],
  ["單引號中提到", "Bash", `echo ${Q}不要跑 npm audit fix${Q}`, false],
  ["雙引號中提到", "Bash", `echo "避免 npm audit fix"`, false],
  ["grep 搜尋該字串", "Bash", `grep -rn "npm audit fix" .claude/`, false],
  [
    "commit 訊息提到 here-string 語法",
    "Bash",
    `git commit -m "$(cat <<EOF\n改用 heredoc 取代 ${AT}${Q}...${Q}${AT}\nEOF\n)"`,
    false,
  ],
  ["正常 heredoc commit", "Bash", `git commit -m "$(cat <<EOF\nfix: 修正\nEOF\n)"`, false],

  // 執行包裝器：內容會被執行，不能當字面量剝掉
  ["bash -c 包起來", "Bash", `bash -c "npm audit fix"`, true],
  ["sh -c 包起來", "Bash", `sh -c "npm audit fix --force"`, true],
  ["eval 執行", "Bash", `eval "npm audit fix --force"`, true],
  ["eval 單引號", "Bash", `eval ${Q}npm audit fix${Q}`, true],

  // 但「提到」執行包裝器不該被擋
  [
    "commit 訊息提到 eval 繞過法",
    "Bash",
    `git commit -m "$(cat <<EOF\n不要用 eval 繞過檢查\nEOF\n)"`,
    false,
  ],

  // 換行與分號分隔的第二段指令
  ["換行後的第二行", "Bash", "echo start\nnpm audit fix", true],
  ["分號串接", "Bash", "echo a; npm audit fix", true],

  // 引號配對的邊界
  ["訊息含縮寫 don't", "Bash", `git commit -m "don't run npm audit fix"`, false],
  ["寫入檔案時提到", "Bash", `echo "# 不要跑 npm audit fix" >> notes.md`, false],

  // main 護欄：即使不在 main 上，明確推向 main 也要擋（cwd 非 repo，分支查不到）
  ["明確 push 到 main", "Bash", "git push origin main", true],
  ["refspec HEAD:main", "Bash", "git push origin HEAD:main", true],
  ["push -u 到 master", "Bash", "git push -u origin master", true],
];

/**
 * 分支相關的判定：直接呼叫 decide(tool, command, branch)，分支由測試指定。
 * [說明, command, 分支, 應否攔截]
 */
const BRANCH_CASES = [
  // 在受保護分支上：寫入類指令一律擋
  ["main 上 commit", "git commit -m \"fix: 修正\"", "main", true],
  ["main 上 push", "git push", "main", true],
  ["master 上 commit", "git commit --amend --no-edit", "master", true],

  // 在功能分支上：同樣的指令要放行
  ["功能分支 commit", "git commit -m \"fix: 修正\"", "feat/x", false],
  ["功能分支 push", "git push", "feat/x", false],
  ["功能分支 push -u", "git push -u origin feat/x", "feat/x", false],

  // 唯讀指令在 main 上也不該擋
  ["main 上 git status", "git status -sb", "main", false],
  ["main 上 git log", "git log --oneline -10", "main", false],
  ["main 上 git diff", "git diff --stat", "main", false],
  ["main 上開新分支", "git checkout -b feat/x", "main", false],

  // 逃生口：豁免必須寫在指令裡
  ["逃生口放行 push", "ALLOW_MAIN=1 git push origin main", "main", false],
  ["逃生口放行 commit", "ALLOW_MAIN=1 git commit -m \"docs: 更新\"", "main", false],

  // 誤擋防線：分支名裡剛好含 main / master
  ["分支名含 main", "git push origin feat/main-nav", "feat/main-nav", false],
  ["分支名含 master", "git push origin fix/master-detail", "fix/master-detail", false],
  ["remote 名叫 main 的目錄", "git push upstream release/main-2026", "release/main-2026", false],

  // 查不到分支（非 git repo）→ 不擋，hook 不該因自身故障卡住工作
  ["分支未知時 commit", "git commit -m \"fix: 修正\"", null, false],

  // 提到但沒執行
  ["訊息提到 push origin main", "git commit -m \"docs: 說明不要 git push origin main\"", "feat/x", false],
];

let failed = 0;
for (const [label, tool, command, expected] of CASES) {
  let actual;
  try {
    actual = run(tool, command);
  } catch (e) {
    console.log(`❌ ${label} — guard 執行失敗: ${e.message}`);
    failed++;
    continue;
  }
  if (actual === expected) {
    console.log(`${expected ? "🛑" : "✅"} ${label}`);
  } else {
    console.log(
      `❌ ${label} — 預期${expected ? "攔截" : "放行"}，實際${actual ? "攔截" : "放行"}`,
    );
    failed++;
  }
}

console.log("");
console.log("— 分支判定（直接呼叫 decide，分支由測試指定）—");
for (const [label, command, branch, expected] of BRANCH_CASES) {
  let actual;
  try {
    actual = decide("Bash", command, branch) !== null;
  } catch (e) {
    console.log(`❌ ${label} — decide 執行失敗: ${e.message}`);
    failed++;
    continue;
  }
  if (actual === expected) {
    console.log(`${expected ? "🛑" : "✅"} ${label}（${branch ?? "分支未知"}）`);
  } else {
    console.log(
      `❌ ${label}（${branch ?? "分支未知"}）— 預期${expected ? "攔截" : "放行"}，實際${actual ? "攔截" : "放行"}`,
    );
    failed++;
  }
}

const total = CASES.length + BRANCH_CASES.length;
console.log("");
if (failed > 0) {
  console.log(`${failed} / ${total} 個案例未通過`);
  process.exit(1);
}
console.log(`全部 ${total} 個案例通過`);
