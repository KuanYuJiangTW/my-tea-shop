# CLAUDE.md — 霧抉茶（my-tea-shop）

正式營運中的高山茶電商＋茶藝體驗預約平台（taiwantea.store）。**不是 demo**：改動會影響真實訂單與金流。

## 技術事實
- Next.js 16（App Router）+ React 19 + TypeScript + Tailwind 3；UI 用 shadcn / @base-ui
- 資料：Supabase（Postgres + RLS）；內容管理：Sanity（`/studio`）；金流：Stripe / PayPal / ECPay 綠界
- i18n：next-intl（zh-TW / EN），字串在 `messages/`
- 指令：`/verify` 一次跑完測試＋型別＋build（`npm run lint` 已失效，見 JUDG-5）
- e2e：`e2e/`（Playwright；瀏覽器已預裝，**不要跑 playwright install**）
- 規格流程：動功能前先讀 `openspec/specs/<能力>/`；變更提案放 `openspec/changes/`
- 部署：Vercel（含 cron，見 `vercel.json`）

## 每次 session 開場（照做，不要跳過）
1. `git status -sb` 確認在指定分支（web session 用系統指定的 `claude/*` 分支）
2. 讀 `.claude/WORKLOG.md` 最後一節：有未完成的工作先接手
3. 記住：web 環境沒有 `gh` CLI，GitHub 一律用 `mcp__github__*` 工具（先 ToolSearch 載入）

## 鐵律
1. **沒 push＝不存在**。每完成一個交付物就 commit+push（容器隨時回收）。
2. **粗活派 subagent**：大量讀檔、掃 repo、查網頁、批次改檔 → 照 `.claude/playbooks/dispatch.md` 派工，主對話只收結論。
3. **完成要有證據**：測試輸出、實跑結果、或 fresh agent read-back；缺證據不得宣告完成（判準：`.claude/playbooks/judgment.md` JUDG-2）。
4. **高風險區**（金流、庫存扣減、auth/2FA、RLS、cron）：改之前先讀對應 openspec 規格，改完必跑 `npm run test`，並套用 judgment.md 的高風險驗證。
5. **改制度檔**（本檔與 `.claude/` 內的檔案）：先照 `.claude/playbooks/maintenance.md`，動手前備份到 `.claude/backups/`。
6. 踩坑後把教訓寫進 `.claude/playbooks/lessons.md`（格式見 maintenance.md），當下就寫，不要留到收尾。

## 路由表（需要時才讀該檔；路徑故意不加 @ 前綴——@ 會整檔預載進 context）
| 情境 | 讀這個檔 |
|---|---|
| 要派 subagent、選 model/effort、升降級 | `.claude/playbooks/dispatch.md` |
| 不確定完成沒、該不該問使用者、方向對不對 | `.claude/playbooks/judgment.md` |
| 要寫委派 prompt（搜尋/實作/重構/研究/審查） | `.claude/playbooks/templates.md` |
| 要修改 `.claude/` 內任何規則檔 | `.claude/playbooks/maintenance.md` |
| 想了解本環境的坑（token/失焦/出錯） | `.claude/playbooks/diagnosis.md` |
| 前人踩過的坑 | `.claude/playbooks/lessons.md` |
| 你是新 session 的第一個 turn | `.claude/playbooks/letter-to-future-sessions.md` |
| 改完要驗證 | 跑 `/verify`（測試＋型別＋build） |
| 修完安全性 bug，要確認測試真的有效 | `reverse-verify` skill |

**自動防護**：`npm audit fix`（會降級 Next.js）與 Bash 裡的 PowerShell here-string
已由 `.claude/hooks/guard-commands.js` 攔截，不必記——但被擋時請讀它給的理由，不要繞過。

## 溝通約定
- 對使用者回覆用繁體中文；程式碼、識別字、工具名照原樣英文。
- Commit 沿用現有慣例：`feat:|fix:|test:|docs:|refactor: ` + 繁中描述（不確定就看 `git log --oneline -10` 對齊）。
- 使用者沒開口就不開 PR、不動 main 分支。
