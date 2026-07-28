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
