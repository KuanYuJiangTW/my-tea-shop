#!/usr/bin/env node
/**
 * PreToolUse guard — 攔截這個專案上「照做就會出事」的指令。
 *
 * 為什麼是 hook 而不是 playbook 規則：這幾條都是「知道也會忘」的機械性錯誤。
 * lessons.md 裡寫了，但下一個 session 不會在按下 Enter 前想起來。
 *
 * 用 node 而非 jq：本機沒有 jq（2026-07-29 實測），node 則是 Next.js 專案的必備。
 *
 * 輸入：stdin 收 hook JSON（含 tool_name、tool_input、cwd）
 * 輸出：要攔截時印出 permissionDecision=deny 的 JSON；放行則不輸出任何東西。
 *
 * 可被 require：`decide(tool, command, branch)` 是純函式（分支由呼叫端給），
 * 測試才不會因為「跑測試時剛好在哪個分支」而飄。
 */

const { execFileSync } = require("child_process");

/** 不允許直接寫入的分支。 */
const PROTECTED_BRANCHES = ["main", "master"];

/** 逃生口：使用者明確要求動 main 時，指令前綴這個字串即可放行。 */
const OVERRIDE = "ALLOW_MAIN=1";

const RULES = [
  {
    // 2026-07-28：npm audit 對 next 的「修補」建議是降級到 9.3.3（--force 會照做）；
    // 不加 force 則改動 328 個套件卻修掉 0 個漏洞。詳見 lessons.md。
    tools: ["Bash", "PowerShell"],
    pattern: /npm\s+audit\s+fix/,
    reason: () =>
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
    reason: () =>
      "Bash 工具不能用 PowerShell 的 here-string 語法 @'...'@。\n" +
      "bash 會把它解讀成「字元 @ 串接字串」，導致 commit 標題變成 \"@\"、正文結尾多一個 @。\n" +
      "多行訊息請改用 heredoc：\n" +
      "  git commit -m \"$(cat <<'EOF'\n  你的訊息\n  EOF\n  )\"\n" +
      "或者改用 PowerShell 工具執行（那裡 @'...'@ 才是正確語法）。",
  },
  {
    // 2026-08-31：為了「只是寫 WORKLOG」直接在 main 上 commit + push，事後得 revert 收拾。
    // 教訓寫進 lessons.md 了，但那條教訓本身就說：會自我豁免的正好都是看起來無害的變更。
    // 所以改用 hook 強制——CLAUDE.md 的「使用者沒開口就不動 main 分支」不再靠自覺。
    //
    // 為什麼是 deny 而不是 ask：文件（2026-08-31 查證）只保證 PreToolUse 支援
    // allow / deny，ask 未列入。護欄失效比誤擋更糟，所以走保證有效的 deny，
    // 另外給一個「必須寫出來」的逃生口——豁免要顯示在指令裡，不能默默發生。
    tools: ["Bash", "PowerShell"],
    needsBranch: true,
    match: (cmd, branch) => {
      if (!/\bgit\s+(?:-\S+\s+)*(?:commit|push)\b/.test(cmd)) return false;
      if (cmd.includes(OVERRIDE)) return false;
      return pushesToProtected(cmd) || PROTECTED_BRANCHES.includes(branch);
    },
    reason: (branch) =>
      `不要直接寫入 ${PROTECTED_BRANCHES.join(" / ")} 分支（目前在 ${branch ?? "未知分支"}）。\n` +
      "CLAUDE.md：「使用者沒開口就不開 PR、不動 main 分支」。\n" +
      "2026-08-31 曾因「只是改文件」自我豁免而違規，事後得 revert 收拾。\n\n" +
      "正確做法：先開分支再提交，**分兩條指令下**\n" +
      "  git checkout -b <type>/<簡述>\n" +
      "  git commit -m \"...\"\n" +
      "不要串成 `git checkout -b x && git commit ...`——本 guard 擋的是整條複合命令，\n" +
      "被擋時前半段的 checkout 也不會執行，等於「全部沒做」（見 lessons.md 2026-07 那條）。\n" +
      "需要合併時開 PR。\n\n" +
      `若使用者這次明確要求直接動 ${PROTECTED_BRANCHES[0]}，在指令前面加上 ${OVERRIDE} 再執行一次，\n` +
      "例如：\n" +
      `  ${OVERRIDE} git push origin ${PROTECTED_BRANCHES[0]}\n` +
      "（豁免必須寫在指令裡，這樣使用者看得到你在做什麼。）",
  },
];

/**
 * 指令有沒有把東西推向受保護分支——即使目前不在該分支上。
 * 逐 token 比對而不用 \bmain\b：後者會誤擋 `git push origin feat/main-nav`。
 */
function pushesToProtected(cmd) {
  const m = cmd.match(/\bgit\s+push\b([^&|;]*)/);
  if (!m) return false;
  return m[1]
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => {
      // refspec `HEAD:main` / `local:remote` 取冒號後那段，其餘直接比對
      const ref = token.includes(":") ? token.slice(token.lastIndexOf(":") + 1) : token;
      return PROTECTED_BRANCHES.includes(ref);
    });
}

/**
 * 剝掉「不會被當成指令執行」的區段後再比對，否則會誤擋——
 * 例如 commit 訊息裡提到 `npm audit fix` 這串字（2026-07-29 實際發生，
 * 本 guard 擋下了說明自己的那筆 commit）。
 *
 * 依序移除：heredoc 內容 → 單引號字串 → 雙引號字串。
 * 順序不可調換：heredoc 內文常含引號，先剝引號會把邊界弄亂。
 */
function stripLiterals(cmd) {
  return (
    cmd
      // 執行包裝器（bash -c "…"、eval "…"）裡的字串是「會被執行的」，不是字面量。
      // 先脫掉外層引號把內容留下來，否則 `bash -c "npm audit fix"` 會整段被剝掉而漏擋。
      .replace(/\b(?:eval|(?:ba|z)?sh\s+-c)\s+(['"])([\s\S]*?)\1/g, " $2 ")
      .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?^\s*\2\s*$/gm, " ")
      .replace(/'[^']*'/g, " ")
      .replace(/"(?:[^"\\]|\\.)*"/g, " ")
  );
}

/**
 * 目前分支；查不到（不是 git repo、git 不在 PATH）回 null，此時不擋。
 *
 * 依序試多個工作目錄而不是只信 payload.cwd：2026-08-31 實測，payload 帶
 * Git Bash 形式的路徑（/c/Users/...）時 node 的 cwd 會直接拋錯，分支查成 null，
 * 護欄就「靜默失效」——這比誤擋糟得多，護欄不能 fail open。
 */
function currentBranch(preferredCwd) {
  const candidates = [preferredCwd, process.env.CLAUDE_PROJECT_DIR, process.cwd()];
  for (const cwd of candidates) {
    if (!cwd) continue;
    try {
      const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (branch) return branch;
    } catch {
      // 換下一個候選目錄
    }
  }
  return null;
}

/**
 * 純判定：回傳命中的規則（含已算好的 reason 字串），沒命中回 null。
 * branch 由呼叫端提供，本函式不碰 git，測試才能指定分支。
 */
function decide(tool, command, branch) {
  if (!command) return null;
  const stripped = stripLiterals(command);

  for (const rule of RULES) {
    if (!rule.tools.includes(tool)) continue;
    const hit = rule.match ? rule.match(stripped, branch) : rule.pattern.test(stripped);
    if (!hit) continue;
    return { reason: rule.reason(branch) };
  }
  return null;
}

/** 這批規則裡有沒有需要查分支的——有才付出跑 git 的成本。 */
function anyRuleNeedsBranch(tool, command) {
  const stripped = stripLiterals(command);
  return RULES.some(
    (r) => r.needsBranch && r.tools.includes(tool) && /\bgit\s/.test(stripped),
  );
}

if (require.main === module) {
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

    const cwd = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const branch = anyRuleNeedsBranch(tool, command) ? currentBranch(cwd) : null;

    const verdict = decide(tool, command, branch);
    if (!verdict) process.exit(0); // 無規則命中 → 放行

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: verdict.reason,
        },
      }),
    );
    process.exit(0);
  });
}

module.exports = { decide, stripLiterals, pushesToProtected, PROTECTED_BRANCHES, OVERRIDE };
