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

## 2026-07-27 套件回傳型別改了，`if (!result)` 就成了永遠通過的假驗證
- 情境：稽核後台 2FA，發現 `otplib` v13 的 `verify()` 回傳 `{ valid: boolean }` 物件而非 boolean；程式碼沿用舊寫法 `const isValid = await verify(...); if (!isValid)`，物件恆為 truthy，導致任何 6 位數驗證碼都通過。同一寫法散在 3 個檔，且零測試覆蓋，兩份人工資安報告都沒抓到
- 代價：後台 2FA 形同虛設（配合固定值 `admin_pending=1` cookie，可無密碼取得完整後台權限）；上線期間一直存在
- 規則：驗證類函式（`verify`/`validate`/`check`）接回傳值時，先在 node 實跑一次印出型別再寫判斷（`node -e "const {f}=require('pkg'); f(...).then(r=>console.log(typeof r, JSON.stringify(r)))"`）；不可假設回傳 boolean。安全判斷式必須有一條「錯誤輸入被拒絕」的回歸測試，且要暫時退回修正、確認該測試會紅，才算數
- 去處：暫存於此（JUDG-2「完成要有證據」的具體化：安全修正的證據＝回歸測試在舊碼上失敗）

## 2026-07-28 「不含惡意字串」是錯的 XSS 斷言，正確的是「惡意字串進不了 script 區塊」
- 情境：修 cvs-callback 反射型 XSS 後寫測試，直覺寫了 `expect(html).not.toContain('window.__pwned')` 與 `expect(html).not.toContain('onload=')`——兩條都失敗。轉義後的 payload 本來就會原樣保留這些「文字」（`&lt;/script&gt;...window.__pwned`），那正是正確行為。另外 `/<div[^>]*\sonload=/` 這種正則也不可靠，因為 `[^>]*` 分不出「真屬性」與「屬性值裡的字」
- 代價：三次來回改斷言，一度以為修正沒生效
- 規則：驗轉義類修正時，斷言要針對「結構」不是「字串存在」——（a）數開閉標籤個數 `html.match(/<script/gi).length`；（b）取出屬性值後檢查裡面沒有未轉義的界定符 `attr).not.toContain('"')`；（c）數標籤內 `="` 出現次數＝預期屬性數；（d）解碼後與原輸入比對確認不失真。絕不用 `not.toContain('<惡意字串>')` 當主要判準
- 去處：暫存於此（與前一條「安全修正需退回舊碼驗證測試會紅」同屬 JUDG-2 證據要求）

## 2026-07-28 收緊權限前，先查「誰在用低權限身分呼叫它」
- 情境：RLS 稽核發現 5 個 RPC 的 EXECUTE 都開放給 anon（PostgreSQL 建函式的預設行為），差點整批建議 REVOKE。實際查 `.rpc(` 呼叫點才發現 `validate_admin_session` 是 `src/proxy.ts` 的 Edge middleware 刻意用 anon key 呼叫的——它做成 SECURITY DEFINER 就是為了避免把 service_role key 帶進 Edge Runtime。整批收掉會讓後台完全登不進去
- 代價：無（出手前查到了），但若照報告 L-6「明確只授權 service_role」照做就會停機
- 規則：建議 REVOKE / 收緊任何權限前，先 `Grep "\.rpc\(|from\(\"<表名>\"" src` 找出全部呼叫點，並確認每個呼叫點用的是哪把 key（service_role 還是 anon）；Edge runtime 的程式碼特別容易是 anon。資安報告的通則建議不能無條件套用，要先對照本專案的實際呼叫方式
- 去處：暫存於此

## 2026-07-28 Bash tool 裡用 PowerShell here-string，commit 標題會多一個 @

- 情境：本環境同時有 Bash 與 PowerShell 兩個工具。在 Bash tool 裡寫 `git commit -m @'...'@`（PowerShell here-string 語法），bash 解讀成「字元 @ 串接單引號字串」，於是 commit 標題變成 `@`、正文結尾多一個 `@`。同一個 session 內犯了兩次

- 代價：兩次 amend + force-push main（第二次還得再次動用破壞性操作）

- 規則：Bash tool 的多行字串一律用 heredoc `git commit -m "$(cat <<'EOF' ... EOF\n)"`；PowerShell here-string `@'...'@` 只能在 PowerShell tool 裡用。送出前先確認工具與語法配對

- 去處：暫存於此

## 2026-07-28 修掉一個「永遠通過」的 bug，會讓它蓋住的第二個 bug 一起浮出來
- 情境：修好後台 2FA 的 `verify()` 型別誤用（舊碼任何驗證碼都通過）後，小江立刻回報 authenticator 的碼登不進去。查出 otplib 的 `epochTolerance` 預設是 0——只收當下那 30 秒窗，零時鐘誤差容許。這個設定從專案上線就是錯的，但因為「任何碼都會過」，它從來沒被實際考驗過。同理，當初綁定 2FA 時 setup 的確認步驟也用了同一個壞掉的 verify，代表使用者輸入任何數字都會存下 secret——資料庫裡的 secret 有可能從一開始就跟手機不一致
- 代價：使用者被鎖在正式站後台外面；我的修正被誤認為是故障來源
- 規則：修掉「驗證恆為通過」這類 bug 時，**當下就把同一條路徑上其他從未被真正執行過的邏輯全部檢查一遍**（時間窗／容差／長度限制／錯誤分支），並主動告知使用者「這個修正可能讓既有的隱藏問題浮現」＋提供復原手段（如何從資料庫停用該機制、如何清限流）。不要等使用者回報才查
- 去處：暫存於此

## 2026-07-28 這個專案不能跑 npm audit fix（會降級 Next.js）
- 情境：處理資安報告 L-1「42 個相依套件漏洞」。`npm audit` 對 next 建議的修補是 `next@9.3.3 (MAJOR)`——那是**降級**，npm 找不到向前路徑時會這樣寫。`--force` 照做等於毀掉整個專案。不加 force 的 `npm audit fix` 則會改動 328 個套件（sanity 跳 12 個 minor、react 也動），修掉的漏洞數是 0（42 → 42）
- 代價：無（dry-run 先看才發現），但若直接執行會是正式站級別的事故
- 規則：對本專案的相依套件漏洞，一律先 `npm audit fix --dry-run` 看變更規模與修補後剩餘數量，再決定要不要跑；**永遠不要用 `--force`**。追 high/critical 時要先用 `npm explain <pkg>` 判斷它在建置期還是執行期——本專案 18 個 high/critical 中 17 個在 `@sanity/cli` 工具鏈或 PostCSS/Tailwind（建置期），唯一有執行期路徑的是 `sharp`（Next 的 optionalDependencies 卡在 `^0.34.5`，修補版 0.35.0 升不上去，屬上游問題）
- 去處：暫存於此

## 2026-07-29 用自己的錯誤假設寫測試，等於沒測——Sanity 時間戳是毫秒不是秒
- 情境：實作 sanity-webhook 的 HMAC 驗證時，照 Stripe 的慣例假設時間戳單位是「秒」，寫了 `Number(ts) * 1000`。但 Sanity 送的是毫秒（`Date.now()`），乘完變成公元五萬年，一律判定「簽章已過期」回 401。10 條測試全過卻沒抓到——因為我的測試也用 `Math.floor(NOW/1000)` 產生秒格式的時間戳，用同一個錯誤假設去驗證錯誤的程式碼
- 代價：小江在 Sanity 後台正確填好 Secret 後，webhook 全部 401，快取更新停擺；他來回測了兩次才從 log 找出原因
- 規則：驗證第三方 webhook／簽章時，**測試資料必須來自該服務的實際請求，不能自己憑格式慣例產生**。做法：先讓一筆真實請求打進來，從 log 或 request dump 取出實際的標頭原文，再據以寫測試。若無法取得真實樣本，至少要在程式碼中同時容納常見的兩種單位（秒／毫秒），並各寫一條測試
- 去處：暫存於此（與「安全修正需退回舊碼驗證測試會紅」互補：那條保證測試有效，這條保證測試的前提正確）

## 2026-07-29 攔截型 hook 會誤擋「提到該指令」的正常操作
- 情境：寫了 PreToolUse hook 攔截危險指令，寫完當下就擋住了自己——(1) 說明這個 hook 的 commit 訊息裡提到了目標字串，被擋；(2) 修好後，hook 的測試腳本因為含有測試用的字面片段，又被擋一次
- 代價：兩次來回；若沒察覺而放著，未來每次要在文件或 commit 訊息提到該指令都會卡住，最後一定有人直接把 hook 關掉——比沒有 hook 更糟
- 規則：寫比對指令內容的 hook 時，先剝掉「不會被執行」的區段再比對——依序移除 heredoc 內容、單引號字串、雙引號字串（順序不可換，heredoc 內文常含引號）。測試案例必須含「提到但未執行」的反例，且測試檔本身要用字串拼接避免自我觸發（見 `.claude/hooks/guard-commands.test.js`）。判準：hook 改完要能通過「用它自己的說明文字當 commit 訊息」這一關
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

## 2026-08-01 外部服務的可用性，文件／費率表／實際 endpoint 會各說各話
- 情境：核實四大超商店到店。綠界「門市訂單建立」API 文件把 `OKMARTC2C` 列為合法值，但「門市電子地圖」文件只列三家，服務介紹頁與費率表則完全沒有 OK。拿正式金鑰實打電子地圖才拿到答案：`OKMARTC2C` 回 30 bytes 的「OK超商暫停服務(若有寄件需求，請使用711、全家、萊爾富)」。反過來，萊爾富被懷疑不能代收，查文件三份來源都沒有明說，最後是用綠界官方公開的 C2C 測試特店（2000933）對 `logistics-stage` 送 `HILIFEC2C + IsCollection=Y`，建單成立才定案
- 代價：無（出手前查到了），但站上「OK 超商」這個壞掉的選項已經掛了不知道多久——客人選了只會拿到一片「暫停服務」，直接卡死結帳
- 規則：判斷第三方服務「某個選項現在還能不能用」時，文件與費率表只當線索，**一律以實打 endpoint 為準**。順序：(1) 唯讀端點（地圖、查詢）用正式金鑰打，看回應內容不只看 HTTP 狀態碼——綠界這種會用 200 回傳錯誤字串；(2) 需要建單／寫入才能判定時，去該服務的**測試環境**用官方公開測試帳號打，不要用正式帳號；(3) 做差異對照——同一組參數只改待測的那一個維度，並拿已知可用的選項當對照組，才能分辨「被這個維度擋下」還是「卡在別的必填欄位」
- 去處：暫存於此（JUDG-7「引用外部規範前查第一手來源」的具體化：第一手來源包含 endpoint 本身，不只是文件頁）

## 2026-08-01 使用者的現場經驗與 API 行為衝突時，先確認是不是兩種不同服務
- 情境：小江說「我去萊爾富寄貨，店員說不能代收貨款」，據此要求把萊爾富的貨到付款關掉。但綠界費率表明列「萊爾富店到店－取貨付款 55元/筆＋代收手續費 0.75%」，撥款結算表也有萊爾富。兩邊都不像講錯。實際是兩種服務：走進櫃台自己填單的萊爾富散客店到店本來就不代收；綠界 C2C 的代收金額是賣家在綠界後台建物流單時填的，門市櫃台全程不經手（費率表註2 自己就寫了「超商門市人員不會先行收取物流運費」）
- 代價：先照現場經驗把萊爾富的貨到付款擋掉，改完、測完、build 完，隔一輪確認後又整套改回來——多繞一趟
- 規則：使用者的第一手觀察與 API／文件衝突時，**不要急著二選一，先問「這是不是同一條路徑」**——同一家廠商常有散客自助版與平台串接版，兩者的能力不同。釐清方式：問使用者當時的實際操作步驟（走櫃台自填單？還是先在後台建單拿編號再去機台印？），並找出「這個能力是在哪一步被設定的」。在釐清前，可以先做兩邊都同意的部分（本例：OK 超商不管誰對都要移除），把有爭議的部分留到最後
- 去處：暫存於此（與 JUDG-3「該不該問使用者」互補：本條是「該問什麼」）

## 2026-08-01 Bash tool 會把 `git show "rev:path"` 的冒號吃掉
- 情境：rebase 解衝突時要看遠端版本，在 Bash tool 跑 `git show "origin/main:.claude/WORKLOG.md"`，回 `fatal: ambiguous argument 'origin\main;.claude\WORKLOG.md'`——冒號變成分號、斜線變成反斜線。加不加引號都一樣，連跑兩次才想到是 Git Bash 的 MSYS 路徑轉換在作怪（它看到含冒號的字串會當成 Unix 路徑清單去轉 Windows 路徑）
- 代價：兩次無效呼叫；錯誤訊息講的是 git 參數歧義，很容易往「引號寫錯」的方向白追
- 規則：本環境凡是參數含冒號的 git 語法（`git show rev:path`、`git diff rev1:file rev2:file`、`git checkout rev -- path` 以外的 `rev:path` 形式）一律改用 PowerShell tool 跑；真的要留在 Bash 就前綴 `MSYS_NO_PATHCONV=1`。同理適用於任何含冒號的參數（如 `--pretty=format:%H`）
- 去處：暫存於此（與「Bash tool 裡用 PowerShell here-string」同屬工具與語法配對問題，兩條都指向：本環境雙 shell 並存，送出前先確認語法屬於哪一邊）

## 2026-08-01 SELECT 少一個欄位，`??` 的 fallback 就從保險變成預設路徑
- 情境：訂單取消退點寫成 `order.points_discount ?? Math.floor(order.points_used / 100)`，看起來是「有新欄位就用新的，沒有就用舊制換算」的合理防禦。但同一支路由的 `.select(...)` 沒把 `points_discount` 列進去，於是它**永遠**是 undefined，fallback 從「意外時的保險」變成「唯一會走的路」。客人用 500 點折抵，取消只退 5 點
- 代價：正式站上不知多久，每筆會員自助取消的訂單都吃掉客人 99% 的折抵點數；三條掛著正確名字的測試全綠（它們只對本地變數做算術，從未呼叫路由），完全沒擋住
- 規則：Supabase／任何顯式列欄位的查詢，**寫完 `??`、`?.`、`||` 的預設值之後，回頭確認那個欄位真的在 select 清單裡**。更根本的做法是別讓 fallback 靜默生效：(a) 測試的 DB mock 要「只回傳 select() 指名的欄位」，忘了 select 就會自然變紅；(b) 相容用的 fallback 要留下痕跡（log 或 metric），不要靜靜地換一條語意不同的路。同一路徑上「扣」與「還」必須引用**同一個欄位**——這裡扣的是 `points_used`，還的卻是 `points_discount`，1:1 時碰巧相等就沒人發現
- 去處：暫存於此（與 2026-07-30「測試全綠不等於符合規格」互補：那條講測試釘錯了規格，這條講測試根本沒接上程式碼）

## 2026-08-01 修好一條路徑不代表修好那個 bug——同一個錯常有第二份拷貝
- 情境：前一輪剛把商品訂單的取消退點改成「以 `point_transactions` 帳本為準」，還寫了 12 條回歸測試、反向驗證 6 次、跑了補償 SQL，整件事看起來收乾淨了。這輪小江問「體驗預約的結帳與取消對不對」，一查——體驗預約是**完全獨立的第二套程式碼**（`/api/bookings/[id]/cancel`、`/api/admin/experience-bookings/[id]/cancel`、`/api/ecpay/experience-checkout`），仍然照 `points_discount` 退、沒有冪等、結帳可重複扣點，一行都沒被上一輪碰到
- 代價：無（小江問了才查），但這條路徑帶著同一個 bug 又多活了一輪。若不是被問到，下次發現可能是客人來客訴
- 規則：**修完一個 bug，用它的「錯誤形狀」而不是它的檔名去 grep 全 repo**。本例的形狀是「讀 `points_discount` 當退還依據」與「退點沒有減去已退」，一條 `grep -rn "points_discount" src/app/api` 就會露出體驗那三支。凡是同一領域有多套並行實作（商品訂單／體驗預約／候補轉正；四條金流路徑），修 A 之後一律逐一開啟 B、C、D 確認，**不要假設它們共用同一個 helper**
- 追記（同日）：後來為了做 cron 才打開 `experience-reminders`，發現**第四份實作**——場次因人數不足自動取消時，只寫了 `refund_status = "pending"`，點數一點都沒退。它躲過前面的 grep，因為那支檔案裡根本沒出現 `points_discount`（漏掉的東西 grep 不到）。補一條做法：**除了 grep 錯誤形狀，還要 grep 那個「狀態轉換」本身**——本例是 `status: "cancelled"`，全 repo 四處，逐一確認每處都做了該做的善後
- 去處：暫存於此（與 2026-08-01「SELECT 少一個欄位」同源：那條講單一路徑的錯，這條講那個錯的複製品）

## 2026-08-01 我從 git 歷史推論線上帳本的內容，被 migration 打臉
- 情境：接上條。要判斷體驗預約舊制「當年到底扣了幾點」，我去 `git show 2e1da44` 讀當時的程式碼，看到 `points: -pointsUsed`，就據此寫進規格檔頭、WORKLOG、lessons、測試註解：「體驗舊制帳本扣的是 `points_used`（3300），照 `points_discount`（33）退會吞掉客人 3267 點」，還說這與商品訂單的舊 bug**方向相反**。小江跑稽核 SQL 回來，帳本實際是 −6 而 `points_used` 是 600。查 `points_system.sql:132` 才發現新制 migration 有一句 `UPDATE point_transactions SET points = ROUND(points/100)` 把**整個帳本**改寫過，而同一份 migration 的 backfill 只處理 `orders`、沒動 `experience_bookings`
- 代價：一個危言聳聽的錯誤結論被寫進四個地方（其中規格檔頭正是為了「不要誤導下一個 session」而寫的），還向使用者報告了不存在的災難情境，事後全部要回頭更正。程式碼修正本身沒錯（帳本法不依賴這個推論），但那是運氣不是判斷
- 規則：**「當年寫進 DB 的是什麼」只能由 DB 回答，程式碼歷史只能回答「當年打算寫什麼」**。兩者之間隔著：insert 靜默失敗（本例 `order_id` FK 擋掉一整批）、後續 migration 改寫、手動修資料。要寫任何關於歷史資料形狀的斷言之前，先跑一段 `SELECT` 看實際列——查詢用 `LEFT JOIN` 才看得到「完全沒有記錄」這種形狀。**在拿到實際輸出之前，規格與文件裡不要寫具體數字**，寧可寫「以帳本為準，原因見稽核 SQL」。連帶檢查：找到任何一句 `UPDATE <表> SET` 的 migration，就要問「它漏掉哪張表沒一起改」——`orders` 被 backfill 而 `experience_bookings` 沒有，兩欄從此永久不一致
- 去處：暫存於此（JUDG-2「完成要有證據」的延伸：對**過去的資料狀態**下斷言，證據只能是查詢輸出，不能是 git log）

## 2026-08-01 派出 checker 之後又改檔，換來一個假 FAIL
- 情境：報價頁交付後派 `checker` 逐條驗收，驗收條件之一是「只涉及產物清單內的檔案」。派工之後我自己發現 `/web-design` 沒進 `src/app/sitemap.ts`，順手補了。checker 回報 11 條裡 10 條 PASS、唯一 FAIL 就是「sitemap.ts 不在授權清單內」——它拿的是我發派當下的清單，那份清單在它讀檔前就過時了
- 代價：一個假 FAIL 混在真 PASS 裡，要人工判讀才知道不是缺陷。危險的是下游處理：若換一個 session 收尾，很可能照著 FAIL 去「修復」，把正確的 sitemap 改動 revert 掉，而那正是讓報價頁被搜尋引擎找到的那一行
- 規則：**從派出 checker 到它回報之間，凍結受驗檔案**。臨時發現要補的東西，二擇一：(a) 記下來，等 checker 回報完再改，改完另派一次；(b) 立刻用 `SendMessage` 通知該 checker 把新檔補進產物清單。無論哪種，回報給使用者時必須逐條點名「哪條 FAIL 是清單過時、哪條是真缺陷」，不可只說「checker 通過了」帶過
- 去處：暫存於此（DISP-6「驗證不自驗」的補充：不自驗之外，還要在驗收期間凍結產物）

## 2026-08-01 catch 裡沒印 response body，401 就被我腦補成「金鑰失效」
- 情境：驗證線上報價頁時，用 PowerShell `Invoke-WebRequest` 帶 `SUPABASE_SERVICE_ROLE_KEY` 打 Supabase REST，拿到 401。我的 catch 只印了 `$_.Exception.Message`（＝「Response status code does not indicate success: 401」），沒印 `$_.ErrorDetails.Message`。於是我推論「金鑰被輪替過、本機失效」，寫進 WORKLOG 並叫小江去 Dashboard 重新複製金鑰
- 代價：向使用者發出一個不存在的故障與一趟白工；錯誤結論一度寫進 WORKLOG（那正是給未來 session 看的檔）。真正原因是 Supabase 新版 API key 會擋「看起來來自瀏覽器」的 secret key 請求——PowerShell 預設 User-Agent 含 `Mozilla`，被判定為瀏覽器。body 裡寫得清清楚楚：`Forbidden use of secret API key in browser`。加 `-UserAgent "node"` 就 200
- 規則：**HTTP 錯誤一律印出 response body 再下結論**。PowerShell 要 `$_.ErrorDetails.Message`（`$_.Exception.Message` 只有狀態碼那句廢話）；curl 用 `-i` 或 `--fail-with-body`。狀態碼只說「失敗」，body 才說「為什麼」——在拿到 body 之前，不要對失敗原因下任何斷言，更不要據此要使用者去改設定。另：本環境用 PowerShell 打任何雲端 API（Supabase／Stripe／綠界）都要顯式 `-UserAgent "node"`，預設 UA 會觸發服務端的瀏覽器防護
- 去處：暫存於此（與 JUDG-2「完成要有證據」同源：錯誤診斷也要有證據，狀態碼不是證據）

## 2026-08-03 用 `npx tailwindcss` CLI 驗產物，三次 probe 全是無效測試
- 情境：加完非顏色 token（`rounded-card`、`shadow-resting` 等）後，想確認 utility 真的生成，於是 `npx tailwindcss -c tailwind.config.ts -i src/app/globals.css -o probe.css` 再 grep。連跑三次都「查無這些 utility」，我一度以為 `theme.extend` 寫錯、開始回頭改 config
- 代價：三輪無謂的來回與一次錯誤歸因。真正原因是**該 CLI 根本沒讀 `tailwind.config.ts`**（TS config 需要 loader，CLI 這條路徑沒載到），產物裡只有 Tailwind 內建 utility。我先前看到 `.rounded-2xl`、`.p-6` 有生成就以為「config 有讀到」，但那些全是內建的——我挑的對照組沒有鑑別力
- 規則：**驗證 Tailwind 產物一律以 `npm run build` 的 `.next` 產物為準，不要用 `npx tailwindcss` CLI**（本專案是 TS config，CLI 讀不到）。若非用不可，對照組必須挑**只有自訂 config 才會產生**的 class（如 `bg-tea-green`），不能挑內建 class——對照組挑錯等於沒有對照組
- 去處：暫存於此（JUDG-2「完成要有證據」的補充：證據還要有鑑別力，「有東西生成」不等於「我的東西生成」）

## 2026-08-04 perl -pi 批次改檔後，dev server 500 且重啟無效——是 .next 的 Tailwind 快取
- 情境：AA 遷移時用 `xargs perl -pi -e 's/.../.../g'` 一次改 39 個 tsx。之後 dev server 全站 500，錯誤是 ``ENOENT: no such file or directory, stat 'src/components/Footer.tsx'``（但該檔明明存在且可讀）。我第一反應是「perl 在 Windows 上沒給備份副檔名，把檔案刪了」
- 代價：一次不必要的恐慌與兩輪白費的 dev server 重啟。實際上**一個檔案都沒少**（`git status` 全是 M、無 D，行數與 HEAD 一致）。真正原因是 `perl -i` 就地改檔會 unlink＋rename，Tailwind 的 `resolveChangedFiles` 剛好在那個空窗 stat 到不存在的路徑，**並把錯誤寫進 `.next` 快取**——所以 restart dev server 沒用，錯誤是從快取讀回來的
- 規則：**批次改檔後若 dev server 報 ENOENT 但檔案存在，先 `rm -rf .next` 再重啟，不要懷疑檔案毀損**。判斷檔案有沒有真的出事，用 `git status -s | grep '^ D'`（有無刪除）＋逐檔比對 `wc -l` 與 `git show HEAD:<file> | wc -l`（有無截斷），不要憑錯誤訊息推論
- 去處：暫存於此（與同日「對照組要有鑑別力」同源：先確認事實，再解釋現象）

## 2026-08-06 本機的 `python` 是 Windows Store 空殼，改檔靜默失敗還不報錯
- 情境：用 `python - <<'PY' ... PY` 就地改 `.claude/WORKLOG.md` 的待辦勾選，連做三次（第三／四／五波收尾）。每次都沒有錯誤輸出，我就當它成功了，接著在回報裡宣告「WORKLOG 已更新」
- 代價：**三處待辦勾選從頭到尾沒生效**，WORKLOG 對後續 session 顯示了錯誤的完成狀態。直到第四次要做 WORKLOG 精簡、發現檔案行數完全沒變才揪出來。實測 `python --version` 回 exit 49 且無任何輸出——`which python` 指向 `C:/Users/Koung/AppData/Local/Microsoft/WindowsApps/python`，那是微軟商店的安裝引導殼，沒有真的 Python
- 規則：**本專案不要用 `python`，改檔一律用 Node（`node ./__x.mjs` 或 Edit tool）**。任何「就地改檔」的腳本執行後，必須立刻用一個會變的量去驗證（`wc -l`、`grep -c` 目標字串、或腳本自己印出替換筆數），**不能因為沒有錯誤輸出就認定成功**。批次替換腳本要主動印出「命中幾筆」，0 筆就是失敗
- 去處：暫存於此（與 2026-08-04「對照組要有鑑別力」同源：沒報錯不等於有做到，要有一個會變的量當證據）

## 2026-08-06 批次替換用正則，跳脫掉了變成字元類別，26 檔全毀
- 情境：後台 746 處 hex 收斂成 class，寫了 `new RegExp(\`\[${hex}\]\`, "g")` 想匹配 `[#3D4A42]`。跳脫在 heredoc → 檔案 → 樣板字串這條鏈上掉了一層，實際生成的是 `/[#3D4A42]/`——**字元類別**，會匹配單獨的 `#`、`3`、`D`、`4`、`A`、`2` 任一字元
- 代價：預期 746 筆，實際替換 12539 筆，26 個檔案全毀（`RevenueChart` 變成 `Revenuetea-cream-darkhart`）。所幸未提交，`git checkout -- <dir>` 完整還原。真正救命的不是我謹慎，是**替換前有盤點數字可對照**——12539 vs 746 一眼就知道出事
- 規則：**批次字串替換一律用 `split(literal).join(replacement)`，不要用正則**（不需要 pattern 就不要引入 pattern 的風險）。若非用正則不可，必須先 `console.log(re.source)` 印出實際生成的 pattern 再跑。無論哪種，都要「先數再寫」：第一遍只統計、逐項斷言實際筆數 == 事前盤點筆數，全部相符才寫檔；不符就中止
- 去處：暫存於此（與同日「python 空殼」同源：批次操作要有一個事前已知的期望值可以對照，否則錯了也不會知道）

## 2026-08-06 把 class 字串抽到共用模組，Tailwind 卻掃不到——content glob 逐目錄列舉的坑
- 情境：狀態徽章的 class 從三個頁面抽到 `src/lib/admin-status.ts` 做單一事實來源。`tailwind.config.ts` 的 content 原本逐目錄列舉 `src/pages`、`src/components`、`src/app`——**不含 `src/lib`**。於是只被該檔引用的 `status-warn` / `status-warn-soft` 完全沒有生成
- 代價：差一步就讓「待付款徽章沒有底色」上線。而且極難察覺——其他 status 色因為前台 `AccountClient.tsx` 也用到而正常生成，只有 admin 獨有的那一組是空的，肉眼掃過 config 與程式碼都看不出問題。抓到它的是「從建置產物 CSS 讀出每個 token 的實際 rgb 再比對」這道驗證
- 規則：**content glob 一律寫 `./src/**/*.{js,ts,jsx,tsx,mdx}`，不要逐目錄列舉**——逐目錄等於埋一條「共用模組不可以含 class 字串」的隱含規則，沒有人會知道。另：**把 class 字串搬到新位置後，必須從建置產物確認該 class 真的生成**，不能只看程式碼改對了
- 去處：暫存於此（與同日兩條同源：批次操作要有事前期望值可對照；這條是「期望值要落在產物上，不是原始碼上」）
