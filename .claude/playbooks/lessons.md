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

## 2026-07-05 npm ci 在本 repo 目前會失敗（lockfile 不同步）
- 情境：建制 session 在容器內驗證單元測試可跑性，先跑 `npm ci`
- 代價：直接 EUSAGE 失敗（Missing: @swc/helpers@0.5.23 from lock file）；誤判成環境問題會白追很久
- 規則：本 repo 裝依賴用 `npm install`；跑完 `git checkout -- package-lock.json` 還原變動——lockfile 更新是產品決策，未經使用者要求不提交；單元測試 `npm run test` 不需要 `.env`，容器內可全跑（2026-07-05 實測 316 test 全綠）
- 去處：暫存於此＋letter 交接區

## 2026-07-05 session 中途建立的自訂 agent 不會立刻註冊
- 情境：建立 `.claude/agents/checker.md` 後立刻用 `subagent_type: "checker"` 派工 → 「Agent type not found」；稍後 harness 重連，同一 session 內就出現在可用清單
- 代價：一次失敗呼叫；不懂機制的話會誤判成 frontmatter 寫壞而亂改檔
- 規則：自訂 agent 呼叫回報 not found 時，先檢查 system-reminder 的可用清單；不在清單就用 `general-purpose` ＋ 顯式 model ＋ 把角色檔內文貼進派工 prompt 頂替，稍後或下個 session 再用正式名稱——不要急著改 frontmatter
- 去處：暫存於此

## 2026-07-05 補記：npm ci 已修復，前一條的 workaround 過時
- 情境：使用者要求修復 lockfile；`npm install` 同步後，乾淨 `npm ci` 與 316 測試全過，已 commit
- 代價：無
- 規則：`npm ci` 已可正常使用，不必再繞道 `npm install`；前一條教訓中仍有效的只剩「lockfile 變動未經使用者要求不提交」這個原則
- 去處：本條即結案註記

## 2026-07-05 harness 內建 skill 不在檔案系統，subagent 查不到
- 情境：checker 對抗審查時掃遍各 skills 目錄，判定 `code-review`/`verify`「不存在」——其實它們是 harness 內建 skill，只出現在主對話的可用 skill 清單
- 代價：一個 false-FAIL；若照它的建議刪掉引用，會白丟兩個好工具
- 規則：判斷 skill 存不存在的唯一依據是「主對話 system-reminder 的可用 skill 清單」，不是檔案系統；subagent 通常沒有 Skill tool，不要派它驗證 skill 存在性
- 去處：DISP-3 已補注意事項

## 2026-07-05 web 環境沒有 gh CLI
- 情境：建制 session 用 `command -v gh` 實測
- 代價：假設它存在的話，GitHub 操作會反覆失敗
- 規則：web session 的 GitHub 操作一律用 `mcp__github__*` 工具（先 ToolSearch 載入）；本機 session 先 `command -v gh` 再決定
- 去處：已入 diagnosis.md 環境事實表與 CLAUDE.md 開場檢查

## 2026-07-29 npm run lint 在本 repo 完全跑不起來（CLAUDE.md 事實過時）
- 情境：製茶過程頁改版要照 JUDG-5 驗 lint，`npm run lint` 回「Invalid project directory provided, no such directory: <repo>/lint」；改直接跑 `npx eslint` 則回「couldn't find an eslint.config.(js|mjs|cjs)」
- 成因：`package.json` 的 lint script 仍是 `next lint`，但本專案是 Next 16——`next lint` 已被移除，參數被當成目錄解析；且 repo 內**沒有任何 eslint 設定檔**（`eslint.config.*` 與 `.eslintrc*` 皆不存在）
- 代價：CLAUDE.md「技術事實」與 JUDG-5 品質底線都把 `npm run lint` 列為驗證手段，照做會卡住；不知情者會誤以為是自己改壞的而白追
- 規則：**在 lint 修好之前，不要把「lint 無新增錯誤」當成可達成的驗收條件**——改用 `npx tsc --noEmit`（過濾出自己動過的檔案）＋ `npm run test` ＋ `npm run build` 三件套。宣告完成時明說「lint 在本 repo 目前不可用」，不要靜默跳過
- 去處：暫存於此。修復本身是產品決策（要裝 eslint 9 flat config ＋ `eslint-config-next`，並改 package.json script），未經使用者要求不擅自動手；已在 openspec change 的 tasks 列為待回報項
