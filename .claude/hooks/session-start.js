#!/usr/bin/env node
/**
 * SessionStart hook — 把 CLAUDE.md「每次 session 開場（照做，不要跳過）」那三步變成必定發生。
 *
 * 為什麼是 hook：那三步寫在提示詞裡就是「靠 AI 自覺」，而自覺是這個環境已知會失效的東西
 * （2026-08-31 的 main 分支違規就是自我豁免）。手冊的分流口訣：100% 必須發生 → hook。
 *
 * 這支只負責「把事實端上桌」，不下判斷也不下指令——
 * 該怎麼做（接手未完成工作、不要動 main）仍然由 CLAUDE.md 規定，一條規則只有一個家（MAINT-3）。
 *
 * 輸出：additionalContext 字串，會被注入 session 開場脈絡。
 * 失敗一律靜默放行：開場 hook 弄壞 session 比少一段脈絡糟得多。
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const PROTECTED_BRANCHES = ["main", "master"];
const MAX_TODO_LINES = 8;

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** 第 1 步：分支與工作區狀態。 */
function branchSection() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!branch) return "**分支**：查不到（不是 git repo 或 git 不在 PATH）";

  const porcelain = git(["status", "--porcelain"]);
  const dirty = porcelain ? porcelain.split("\n").filter(Boolean).length : 0;
  const state = dirty === 0 ? "工作區乾淨" : `工作區有 ${dirty} 個未提交變更`;

  let line = `**分支**：\`${branch}\`（${state}）`;
  if (PROTECTED_BRANCHES.includes(branch)) {
    line +=
      `\n> ⚠️ 你在受保護分支上。CLAUDE.md：「使用者沒開口就不開 PR、不動 main 分支」。` +
      `\n> 要改任何東西（**包含只改文件**）先 \`git checkout -b <type>/<簡述>\`。` +
      `\n> guard-commands hook 會擋下 main 上的 commit/push。`;
  }
  return line;
}

/**
 * 第 2 步：WORKLOG 最後一節，重點是「還沒做的」。
 * 只取標題與待辦清單——整節貼進來會吃掉開場脈絡，而待辦才是要接手的東西。
 */
function worklogSection() {
  const file = path.join(ROOT, ".claude", "WORKLOG.md");
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return "**WORKLOG**：讀不到 `.claude/WORKLOG.md`";
  }

  const lines = text.split(/\r?\n/);
  const lastSection = lines.map((l, i) => [l, i]).filter(([l]) => /^## /.test(l)).pop();
  if (!lastSection) return "**WORKLOG**：找不到任何 `## ` 章節";

  const [heading, start] = lastSection;
  const body = lines.slice(start + 1);

  // 「還沒做的」小節：從它開始到下一個小標或檔尾
  const todoStart = body.findIndex((l) => /^###\s*還沒做的/.test(l));
  let todo = [];
  if (todoStart !== -1) {
    for (const line of body.slice(todoStart + 1)) {
      if (/^#{2,3}\s/.test(line)) break;
      if (line.trim()) todo.push(line);
    }
  }

  let out = `**WORKLOG 最後一節**：${heading.replace(/^##\s*/, "")}`;
  if (todo.length === 0) {
    out += "\n（該節沒有「還沒做的」小節——可能已收尾，仍請自己確認）";
  } else {
    const shown = todo.slice(0, MAX_TODO_LINES);
    out += "\n還沒做的：\n" + shown.join("\n");
    if (todo.length > shown.length) {
      out += `\n…（另有 ${todo.length - shown.length} 行，讀 .claude/WORKLOG.md 看全文）`;
    }
  }
  return out;
}

/** 第 3 步：這個容器有沒有 gh CLI——沒有就得走 mcp__github__*。 */
function githubSection() {
  const probe = process.platform === "win32" ? ["where", "gh"] : ["which", "gh"];
  try {
    execFileSync(probe[0], [probe[1]], { stdio: "ignore" });
    return "**GitHub**：`gh` CLI 可用。";
  } catch {
    return "**GitHub**：`gh` CLI **不可用** → 一律改用 `mcp__github__*` 工具（先用 ToolSearch 載入 schema）。";
  }
}

try {
  const context = [
    "## Session 開場自動檢查",
    "（由 `.claude/hooks/session-start.js` 產生；對應 CLAUDE.md 的開場三步驟，你不必再自己跑一次）",
    "",
    branchSection(),
    "",
    worklogSection(),
    "",
    githubSection(),
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: context,
      },
    }),
  );
} catch {
  // 靜默放行
}
process.exit(0);
