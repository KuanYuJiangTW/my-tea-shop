# 教訓紀錄（LESSONS）

> 踩坑當下就 append 一條，格式與合格判準見 maintenance.md MAINT-2。不可改寫舊條目。滿 30 條照 MAINT-4 精簡。

## 2026-07-05 .gitignore 整包忽略 .claude/，制度檔差點推不上去
- 情境：建制 session 要把 playbooks 提交進 repo，發現 `.gitignore` 有 `.claude/`
- 代價：若未發現，所有制度檔 push 後等於不存在，整個 session 白做
- 規則：新增要提交的 `.claude/` 子項前，先跑 `git check-ignore -v <路徑>` 確認沒被忽略；被忽略就用白名單寫法（`.claude/*` ＋ `!` 例外），不能只加 `!` 在 `.claude/` 整目錄排除底下
- 去處：已修 `.gitignore`；規則暫存於此

## 2026-07-05 CLAUDE.md 的 @路徑 會在開場整檔載入
- 情境：設計路由表時查官方文件確認 import 行為
- 代價：若用了 `@`，所有 playbook 每個 session 都整包進 context，路由設計自我毀滅
- 規則：CLAUDE.md 引用檔案一律寫純文字路徑；要提到 `@` 字元本身就包在 backticks 裡
- 去處：已入 diagnosis.md 環境事實表

## 2026-07-05 web 環境沒有 gh CLI
- 情境：建制 session 用 `command -v gh` 實測
- 代價：假設它存在的話，GitHub 操作會反覆失敗
- 規則：web session 的 GitHub 操作一律用 `mcp__github__*` 工具（先 ToolSearch 載入）；本機 session 先 `command -v gh` 再決定
- 去處：已入 diagnosis.md 環境事實表與 CLAUDE.md 開場檢查
