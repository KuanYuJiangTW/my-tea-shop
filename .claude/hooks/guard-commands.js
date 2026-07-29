#!/usr/bin/env node
/**
 * PreToolUse guard — 攔截這個專案上「照做就會出事」的指令。
 *
 * 為什麼是 hook 而不是 playbook 規則：這兩條都是「知道也會忘」的機械性錯誤。
 * lessons.md 裡寫了，但下一個 session 不會在按下 Enter 前想起來。
 *
 * 用 node 而非 jq：本機沒有 jq（2026-07-29 實測），node 則是 Next.js 專案的必備。
 *
 * 輸入：stdin 收 hook JSON（含 tool_name、tool_input）
 * 輸出：要攔截時印出 permissionDecision=deny 的 JSON；放行則不輸出任何東西。
 */

const RULES = [
  {
    // 2026-07-28：npm audit 對 next 的「修補」建議是降級到 9.3.3（--force 會照做）；
    // 不加 force 則改動 328 個套件卻修掉 0 個漏洞。詳見 lessons.md。
    tools: ["Bash", "PowerShell"],
    pattern: /npm\s+audit\s+fix/,
    reason:
      "本專案禁止執行 npm audit fix。\n" +
      "--force 會把 Next.js 從 16.2.12 降級到 9.3.3（npm 找不到向前修補路徑時的建議）；" +
      "不加 --force 則會改動 328 個套件而修掉 0 個漏洞（42 → 42）。\n" +
      "要評估相依套件漏洞請改用 `npm audit --json` 檢視，並用 `npm explain <pkg>` " +
      "判斷該套件在建置期還是執行期。理由見 .claude/playbooks/lessons.md。",
  },
  {
    // 2026-07-28～29：同一個 session 犯兩次，兩次都得 amend + force-push main 收拾。
    tools: ["Bash"],
    // 比對的是「剝掉字面量之後」的殘骸：`-m @'msg'@` 剝掉 'msg' 會剩下 `-m @ @`，
    // 而「訊息裡剛好提到這個語法」會整段被剝掉，不會誤擋。
    pattern: /-m\s+@/,
    reason:
      "Bash 工具不能用 PowerShell 的 here-string 語法 @'...'@。\n" +
      "bash 會把它解讀成「字元 @ 串接字串」，導致 commit 標題變成 \"@\"、正文結尾多一個 @。\n" +
      "多行訊息請改用 heredoc：\n" +
      "  git commit -m \"$(cat <<'EOF'\n  你的訊息\n  EOF\n  )\"\n" +
      "或者改用 PowerShell 工具執行（那裡 @'...'@ 才是正確語法）。",
  },
];

/**
 * 剝掉「不會被當成指令執行」的區段後再比對，否則會誤擋——
 * 例如 commit 訊息裡提到 `npm audit fix` 這串字（2026-07-29 實際發生，
 * 本 guard 擋下了說明自己的那筆 commit）。
 *
 * 依序移除：heredoc 內容 → 單引號字串 → 雙引號字串。
 * 順序不可調換：heredoc 內文常含引號，先剝引號會把邊界弄亂。
 */
function stripLiterals(cmd) {
  return cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?^\s*\2\s*$/gm, " ")
    .replace(/'[^']*'/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, " ");
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0); // 解析不了就放行，hook 不該因自身故障擋住工作
  }

  const tool = payload.tool_name ?? "";
  const command = payload.tool_input?.command ?? "";
  if (!command) process.exit(0);

  for (const rule of RULES) {
    if (!rule.tools.includes(tool)) continue;
    if (!rule.pattern.test(stripLiterals(command))) continue;

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: rule.reason,
        },
      }),
    );
    process.exit(0);
  }

  process.exit(0); // 無規則命中 → 放行
});
