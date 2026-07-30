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

## 2026-07-29 Playwright 有 e2e/ 卻不是專案依賴
- 情境：製茶過程頁要實測互動行為，`node` 匯入 playwright 得 ERR_MODULE_NOT_FOUND；查 `package.json` 完全沒有 playwright 或 `@playwright/test`，但 `e2e/` 有 6 個 spec ＋ `playwright.config.ts`
- 成因：CLAUDE.md 寫「瀏覽器已預裝、不要跑 playwright install」——那句只保證**瀏覽器 binary**（`/opt/pw-browsers`），不保證**npm 套件**在 `node_modules`
- 代價：以為 `e2e/` 可直接跑而排進驗收計畫，會卡住；誤把「不要 playwright install」讀成「什麼都不用裝」
- 規則：要在本環境驗互動，把 playwright **裝在 scratchpad 的獨立 package**（`npm init -y && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright`），用 `executablePath: "/opt/pw-browsers/chromium"` 指向預裝瀏覽器。**不要**為了驗證就往 repo 的 package.json 加依賴——那是未經要求的產品變更
- 去處：暫存於此；`e2e/` 是否該補依賴屬產品決策，已列入 openspec tasks 待回報

## 2026-07-29 用 networkidle 當驗證的等待條件會給出假陰性
- 情境：Playwright 驗「進站帶 #redOolong 應切到紅烏龍」，`waitUntil:"networkidle"` ＋ 固定 600ms 後判定失敗；改等 `[role="tab"][aria-selected="true"]` 實際出現後再測，同一份程式碼是通過的
- 成因：頁面有外部資源載不到（沙箱代理擋掉字型／圖片），networkidle 的判定與 React hydration 完成與否無關——它可能在 hydration 前就返回
- 代價：差點把正常功能當成 bug 去「修」；反過來也可能讓真 bug 被固定 sleep 蓋過去
- 規則：驗前端狀態一律等**該狀態自己的 DOM 證據**（`waitForSelector` 等到 aria 屬性／文字出現），不要用 networkidle 或裸 `waitForTimeout` 當同步點
- 去處：暫存於此

## 2026-07-29 pkill -f "<pattern>" 會連自己的父 shell 一起殺
- 情境：想收掉背景的 `next start`，下 `pkill -f "next start" && npm run build`，整條命令回 exit 144 且無輸出
- 成因：父 shell 的命令列字串本身含有 `next start`（就在 pkill 的參數裡），`-f` 比對整個 command line 時把自己的 shell 也命中了
- 代價：命令靜默中斷，看起來像 build 壞掉，實際上 build 根本沒跑到
- 規則：收埠口用 `fuser -k <port>/tcp`；真要 pkill 就讓 pattern 不出現在自己的命令列（例如 `pkill -f 'next[ ]start'`），且不要與後續步驟串在同一條命令
- 去處：暫存於此

## 2026-07-30 補記：npm run lint 已修復，前一條的替代方案過時
- 情境：使用者要求修復 lint。實際缺的**只有設定檔**——`eslint` ^9 與 `eslint-config-next` 本來就在 devDependencies（前一條說「需要裝」不準確）。已補 `eslint.config.mjs`（flat config）、把 `eslint-config-next` 由 15.5.12 升到 16.2.12 對齊 Next 16 大版本、`package.json` 的 lint script 由已被移除的 `next lint` 改為 `eslint`
- 代價：無。修好後 `CLAUDE.md` 技術事實與 JUDG-2「最低門檻」第 2 條重新成立，兩個檔都不必改
- 規則：`npm run lint` 已可正常使用，JUDG-2 第 2 條照原文執行。**判斷「某工具在本 repo 壞了」時，先分清是「套件沒裝」還是「設定檔沒有」**——`npx <tool>` 的錯誤訊息會講明白（「couldn't find config」＝有裝沒設定，`ERR_MODULE_NOT_FOUND`＝沒裝），不要跳過這一步就下結論
- 去處：本條即結案註記；前一條（2026-07-29）中仍有效的只剩「`next lint` 已被 Next 16 移除」這個事實

## 2026-07-30 eslint-config-next 帶進的 react-hooks 規則抓到 tsc 抓不到的 bug
- 情境：lint 修好後首次全 repo 掃描，65 個問題裡有 1 個落在本次新寫的 `ProcessContent.tsx`：`react-hooks/set-state-in-effect`——我用 effect 去「修正」切換茶款後失效的 `activeStep`，在 effect body 直接 setState
- 代價：若沒 lint 就會留著。它不是型別錯誤（`tsc` 全綠）、也不會讓測試紅燈，只會安靜地多一次連鎖 render，並讓「當前步驟」有兩個事實來源
- 規則：**用 effect + setState 去修正另一個 state 之前，先問能不能在 render 時推導**（derive，不要 sync）。這類問題 `tsc` 與單元測試都抓不到，只有 `npm run lint` 會擋
- 去處：暫存於此

## 2026-07-30 我推論出一句帶合規風險的農藥宣稱，還寫上了線
- 情境：製茶過程頁的蜜香紅茶文案。店主給的事實是「蜜香來自小綠葉蟬叮咬（著蜒）」，我據此推論成「**要蜜香就不能用藥**」並寫進 zh/en 共 4 處。店主校對時更正：仍會用藥防治小綠葉蟬以外的病蟲害，**不得寫成不用藥**
- 代價：這是對外的農藥宣稱，若上線等於在營運中的電商頁面對客人做不實的無農藥聲明——風險等級遠高於一般文案錯字。而且它通過了測試、lint、build、checker 前的所有自查，因為那些都不檢查「事實對不對」
- 規則：**寫到下列任一類宣稱時，一律標記為待確認、不得由推論產生**：農藥／有機／無添加、認證與獎項、產地與海拔、成分與含量、保存期限、療效與健康功效、價格與折扣條件。判準是「這句話若不實，會不會構成不實廣告」——會，就必須有店主原話為依據，不能從相鄰事實推導
- 去處：暫存於此。已在 `tea-process.test.ts` 對農藥宣稱加黑名單比對測試防復發；此類宣稱建議日後都比照加測試

## 2026-07-30 「測試全綠」不等於「符合規格」——我寫的測試把違規釘成了正確
- 情境：規格「製程參數不得虛構」把方案 B 限定在**新增**工序，並明文既有溫度時數 SHALL 保留。我誤讀為全面禁用，刪掉 6 步已確認參數，**並寫了一條測試斷言「不得出現溫度時數」**。此後 345 測試全綠、lint 零問題、build 成功，我還拿這些當完成證據回報
- 代價：測試從防線變成掩護。若非 checker 逐條對規格原文，這個違規會帶著「全綠」的背書上線。同時丟失店主已確認的製程事實
- 規則：**寫測試前先讀規格原文那一段，不要憑對規格的印象寫斷言**。禁止類斷言（`not.toMatch`）風險最高——它會把「我以為不該有的東西」永久排除，一旦前提錯了就再也沒人發現。凡是禁止類斷言，必須在註解寫出規格出處（檔名＋節名），並優先寫成**雙向**斷言（該有的要有、不該有的不能有）
- 去處：暫存於此
