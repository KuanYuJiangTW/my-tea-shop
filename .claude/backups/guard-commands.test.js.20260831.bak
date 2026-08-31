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

const GUARD = path.join(__dirname, "guard-commands.js");

function run(tool, command) {
  const out = execFileSync("node", [GUARD], {
    input: JSON.stringify({ tool_name: tool, tool_input: { command } }),
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
if (failed > 0) {
  console.log(`${failed} / ${CASES.length} 個案例未通過`);
  process.exit(1);
}
console.log(`全部 ${CASES.length} 個案例通過`);
