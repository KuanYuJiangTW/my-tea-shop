# 給未來 session 的信

> 寫於 2026-07-05，由 Fable 5 在唯一一次建制 session 中留下。append-only：後人只能在檔末「交接區」加註，不能改寫本文（MAINT-1）。
> 你如果是新 session 的第一個 turn 讀到這裡：先照 CLAUDE.md 的開場檢查做，再回來看完這封信，五分鐘。

## 一、三件沒人問我、但我認為對這個環境最重要的事

### 1. 你在動的是一門生意，不是一份程式碼
taiwantea.store 正式營運中：真金流（Stripe／PayPal／ECPay）、真客戶資料（Supabase）、真信件（Resend）。這個 repo 最貴的失敗不是「程式寫壞」——寫壞會被測試接住——而是**測試全綠、但商業行為變了**：運費少收 60 元、折價券可疊用、庫存超賣。測試驗的是你寫下的斷言，不是生意規則本身。

所以：`openspec/specs/` 是生意規則的合約。動高風險區（金流、庫存、券、auth、cron）之前先讀對應規格；**發現 code 與 spec 不一致時，那是一個要回報的發現，不是一個要順手修掉的錯**——你不知道哪邊才是老闆要的。這個 repo 裡「慢而驗證過」永遠贏「快而看似合理」。

### 2. 記憶只有 repo 一條命
這個環境是暫時容器：session 結束，`~/.claude/`、對話記憶、你學到的一切全部蒸發。**唯一跨 session 存活的就是 push 進 repo 的檔案。**推論很直接：
- 學到值得記的事 → 當下寫進 lessons.md 或 WORKLOG，當下 push。「等收尾再寫」＝賭 session 不會斷線。
- WORKLOG.md 是你和上一個、下一個 session 之間唯一的溝通管道，把它當同事交接文件寫，不是當日記寫。
- 一個沒 push 就結束的 session，等於自己刪掉自己的工作。

### 3. 先知道這個容器裡什麼「本來就跑不起來」，再開始追錯
容器裡沒有 `.env`（secrets 不會進 repo）。所以有些失敗**不是你的 bug，是環境天生的**：連 Supabase／Sanity／金流的整合路徑、寄信、e2e（要活的 app ＋ secrets）。追錯之前先分類：錯誤訊息指向「缺環境變數、connection refused、第三方 401」→ 環境限制，記下來、換可行的驗證方式（單元測試、lint、build、程式邏輯 read-back），並在回報裡明說「這部分在本環境驗不了」。
本次實測結果（2026-07-05，`npm ci` ＋ `npm run test`）：見下方「查證狀態」第 4 點。

## 二、這套制度最可能的退化方式（按可能性排序）與預防

1. **無聲失效**——規則還在檔案裡，但沒人照做，也沒人發現。最早的症狀：lessons.md 停止長大、完成宣告不再附證據。預防：MAINT-5 健檢；使用者也可以隨時抽查一句「把這次 JUDG-2 的證據給我看」。
2. **驗收變橡皮圖章**——checker 收到的驗收條件退化成「確認沒問題」這種不可驗證句，PASS 變裝飾品。預防：checker 的規則 4 會拒收不可驗證條件（這是故意設計的煞車，不要為了省事拿掉它）；抽查 checker 報告有沒有 file:line 證據。
3. **規則通膨**——每次小事故就加一條規則，CLAUDE.md 長回 300 行，弱模型索性全部不讀。預防：MAINT-4 行數上限＋「一條規則只有一個家」＋lessons 滿 30 條要升格合併而不是繼續堆。
4. **過時事實變假權威**——model enum 變了、路徑搬了、文件改了，但制度檔還寫著 2026-07-05 的狀態，未來模型信檔案不信現實。預防：diagnosis.md 每條事實都附了驗證方法；鐵則是**現實與檔案衝突時，以現實為準，然後更新檔案**（MAINT-1 允許直接修事實）。
5. **貨物崇拜**——照字面守規則、丟掉規則要解的問題：兩分鐘的小事也開 subagent、可逆的 typo 也去問使用者。預防：每條規則都寫了反例（不該觸發的情況），反例跟正例一樣重要；覺得規則在礙事時，先讀它的反例再決定。

## 三、本次建制的查證狀態（誠實條款）

**已驗證**（可直接信）：
1. web 容器無 `gh` CLI（`command -v` 實測）；node/npm/python3/rg/jq 存在
2. `.claude/agents/*.md` frontmatter 欄位、`model` 與 `effort` 合法值、`@import` eager 行為、web 環境持久化範圍——皆經 claude-code-guide 對官方文件查證，citation URL 集中在 diagnosis.md「事實來源」一節
3. `.gitignore` 白名單寫法有效（`git check-ignore -v` 實測）
4. 單元測試在容器內可跑性：實測結果補記於交接區（撰寫本信時測試仍在背景執行）

**未驗證／假設**（用之前先確認）：
1. 未來 harness 的 Agent tool model enum 是否仍為 sonnet/opus/haiku/(fable)——**每次派工前看自己 session 的 schema**
2. 本 session 中途建立的自訂 agent（checker/judge）是否要等下個 session 才載入——收尾時會實測，結果記在 lessons.md
3. e2e 在容器內預期跑不起來（缺 secrets ＋ 需要活的 app）——屬合理推斷，未實測；要用時先小規模驗證

## 四、一句話哲學

**證據優先於自信；repo 優先於記憶；便宜模型優先於貴模型、但失敗要快升級；規則的反例和正例一樣重要。**

祝順利。你比我小，但你有制度、有前人的教訓、還有寫得下字的 repo——這夠了。

---

## 交接區（append-only，後續 session 只加不改）

### 2026-07-05（建制 session 補記）
- 查證狀態第 4 點實測結果：`npm install` 後 `npm run test` **全綠（26 檔案／316 測試，3.5 秒），不需要 `.env`**——單元測試 mock 完整，容器內可放心當驗證手段。注意 `npm ci` 目前是壞的（lockfile 缺 `@swc/helpers@0.5.23`），處理方式見 lessons.md。
- 查證狀態「未驗證」第 2 點已解：中途建立的自訂 agent **不會立刻註冊，但 harness 重連後同 session 內即可用**；你讀信的這個 session 裡 checker/judge 一定已就位，派工前仍以你的可用 agent 清單為準。
- 更正註記（透明揭露）：本文「查證狀態」第 2 點在建制 session 定稿前由原作者修改過一次——原句宣稱「citation 詳見各檔引用處」但當時各檔並無 URL（checker 抓到的），已改為指向 diagnosis.md「事實來源」。append-only 規則自建制 session 結束起算；此後任何人（含建制者的後續 session）都不得再改本文，只能在此區加註。
