# 環境診斷：三大失效模式與對策（DIAG）

> 寫於 2026-07-05（Fable 5 建制 session）。依據：本環境實測 + 官方文件查證（有 citation 的才寫）。
> 其他 playbook 用「DIAG-1」這種編號引用本檔。
> 適用範圍：Claude Code 遠端（web）session。本機 session 的差異會標註「本機：」。

## 0. 環境事實速查（全部已實測或查證，不要憑訓練記憶推翻）

| 事實 | 對你的影響 |
|---|---|
| 容器是暫時的，session 結束或閒置就回收 | 沒 commit+push 的東西＝消失 |
| `~/.claude/` 不跨 session 保留（web 環境） | 制度與記憶只能放 repo 內，push 了才算數 |
| 沒有 `gh` CLI（已用 `command -v gh` 驗證） | GitHub 操作一律用 `mcp__github__*` 工具。本機：`gh` 可能存在，先 `command -v gh` 確認 |
| MCP 工具與部分內建工具是 deferred，直接呼叫會失敗 | 先 `ToolSearch("select:工具名")` 載入 schema 再呼叫 |
| Agent tool 的 `model` 參數只接受當下 schema 列的 enum | 派工前看自己 session 的 Agent tool 定義；不要假設 fable/mythos 存在 |
| CLAUDE.md 裡 `@路徑` 會在 session 開始時整檔載入（eager，最深 4 層） | 路由引用一律寫純文字路徑，禁用 `@` 前綴 |
| repo 內 `.claude/agents/*.md` 會自動載入為可用 subagent | 制度化的派工角色放這裡，每個 session 都拿得到 |
| `.mcp.json`（2026-08-31 建）宣告 supabase 與 sanity 兩個 remote MCP，走 OAuth，**檔內沒有任何密鑰** | 進版控是刻意的：新容器 clone 下來就有設定。但**授權要在互動式 `claude` 打 `/mcp` 完成**，非互動 session 會看到「Pending approval」 |
| supabase MCP 的 URL 帶 `?read_only=true&project_ref=...`——**那兩個參數是安全邊界，不是裝飾** | `read_only` 讓查詢以唯讀 Postgres 使用者執行；`project_ref` 綁定單一專案並停用帳號層級工具。**不要為了「查不到東西」把它們拿掉**。唯讀仍讀得到 `orders`／`experience_bookings` 的客人個資，撈資料前先想清楚要不要 |
| sanity MCP 的 OAuth session **7 天過期**；Sanity 寫入**即上線、無預覽緩衝** | 過期就重新授權。寫入前照 copy-guardian 的規矩：先比對原文一字不差、用 `ifRevisionID` 鎖版本 |
| Playwright 瀏覽器已預裝（`/opt/pw-browsers`） | 不要跑 `playwright install` |
| 對外 HTTPS 走 agent proxy | TLS 錯誤時看 `/root/.ccr/README.md`，不要關閉憑證驗證 |
| **本機（Windows）：Avast 攔截 HTTPS，`preview_start` 的子行程拿不到 `NODE_EXTRA_CA_CERTS`** | 連 Supabase 會 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`，頁面靜默變成「共 0 款茶品」——**看起來像沒資料，其實是連不上**。解法：`.claude/launch.json` 用 `cmd /c "set NODE_OPTIONS=--use-system-ca && npm run dev"`（讀 Windows 憑證庫，不寫死 Avast 路徑）。該檔已被 gitignore，屬本機設定不進 repo |
| **本機（Windows）：PowerShell 把路徑裡的 `[slug]` 當萬用字元** | 本專案是 App Router，`[...]` 目錄到處都是。碰檔案路徑一律 `-LiteralPath`（`Get-Content`／`Test-Path`／`Remove-Item`／`Copy-Item` 皆同）。2026-08-06 實測：101 處替換只中 88，8 個動態路由檔**靜默跳過且指令仍 exit 0**，只有事前盤點的期望值抓得到 |
| **repo 內既有 `.ts`／`.json` 是 CRLF（`git config core.autocrlf` = true）** | 用 Node 改檔時，LF 字面值比對會靜默 MISS。讀進來先正規化行尾、寫回時還原；**搜尋字串找不到一律 throw／exit(1)，不可靜默跳過** |
| **Bash tool 的 heredoc 會吃掉一層反斜線；`node -e` 帶巢狀引號也會被 shell 吃掉** | 兩者都讓改檔腳本變成語法錯或靜默 no-op（2026-08-18 與 2026-08-25 各中一次；後者是 `/[^}]*/` 被吃成 `/?/`）。做法：腳本寫進 scratchpad 的 `.js` 再 `node <檔案>`，而且 **JS 內容盡量不要出現反斜線**——要 CRLF 就用 `String.fromCharCode(13,10)`，要正規表示式就直接寫進目標檔而不是經由產生器 |
| **dev server 留下的 `.next` 會毒化 `next build`** | 錯誤會指向 `next/font`、`@vercel/turbopack-*` 這類你這次沒碰的框架內部模組。判準：錯誤訊息裡的檔案不在你的 diff 範圍內就先懷疑快取 → 停掉 dev server ＋ `rm -rf .next` 再跑一次，不要去查那個模組 |
| **Browser pane 的 CSP 沒有 `unsafe-eval`，React dev 模式起不來** | dev server 的頁面**永遠停在未 hydrate**：畫面是對的、量測也正常，只有事件處理器全部無效，最像「你自己改壞了」。驗互動改用 production build（`npm run build` ＋ `next start` 另一個埠）；點擊沒反應先 `read_console_messages` 找 `eval() is not supported` |
| **Browser pane 未顯示時 `document.visibilityState === "hidden"`，rAF 一秒 0 次回呼** | 「畫面沒動」**不能**推論程式壞了（曾據此重寫一支本來就正常的元件，白費兩個 commit）。驗動畫前先跑探針讀 `visibilityState` 或數 rAF 次數；hidden 就改驗靜態產物（SSR HTML、computed style、DOM 文字），動畫本身在報告裡標明「未驗」。截圖同理會 timeout |
| **`.claude/launch.json` 經 `cmd /c set VAR=1 && ` 傳的環境變數會多一個尾空白** | 值實際是 `"1 "`，嚴格比較永遠 false。讀取端 `?.trim()` 再比較，或把該 `set` 放在整串命令最後、緊接 `&&` 前不留空白 |

**事實來源（2026-07-05 查證的 citation）**：
- Avast/CA 那條為 2026-08-06 實測：從 Bash（有繼承環境變數）啟動 dev server → 「共 5 款茶品」且 0 個 TLS 錯誤；從 `preview_start` 啟動 → 「共 0 款」且日誌滿是憑證錯誤；改 launch.json 加 `--use-system-ca` 後 preview 也正常。判別法：直接 `node` fetch 得通但 dev server 不通 → 就是環境變數繼承問題，不是網路或 RLS
- agents frontmatter（name/description 必填；tools/model/effort 等選填）、model 別名、effort 值域 `low|medium|high|xhigh|max`（預設 inherit）：https://code.claude.com/docs/en/sub-agents.md
- `@path` import 為 eager、最深 4 層、純文字路徑不會載入：https://code.claude.com/docs/en/memory.md
- web 容器暫時性、只有 repo 內容跨 session、repo 內 agents 自動載入：https://code.claude.com/docs/en/claude-code-on-the-web.md
- 重新查證方式：派 `claude-code-guide` 並要求附 citation URL；文件與現實衝突時，以現實為準再更新本檔（MAINT-1）。

## DIAG-1 最漏 token：主對話自己做粗活

**症狀**：主對話直接掃 repo、整檔 Read、讓 npm/vitest 完整輸出或 GitHub MCP 大回傳（整包 PR diff、CI log）灌進 context。

**為什麼嚴重**：context 滿了會觸發自動壓縮；壓縮後判斷力在任務後段——最需要判斷的時候——最差。這是複利型損失，不只是浪費錢。

**修法（照做即可）**：
1. 三檔規則——出現任一情況就派 subagent，主對話只收結論（怎麼派見 dispatch.md）：
   - 要完整讀 3 個以上檔案才能回答 → Explore agent
   - 要在 2 個以上不熟的目錄裡找東西 → Explore agent
   - 任何網頁研究、官方文件查證 → general-purpose 或 claude-code-guide
2. 長輸出指令一律導檔再看尾巴：
   `npm run build > /tmp/build.log 2>&1; tail -30 /tmp/build.log`
   build、test、install 全部適用；要追錯誤就 Grep 那個 log 檔，不要重跑整包進 context。
3. Read 大檔用 offset/limit 讀區段；Grep 用 `output_mode: "content"` + `head_limit`，不要整檔撈。
4. GitHub MCP 一律 pagination（5–10 筆）+ `minimal_output: true`。看 PR 內容不要把整包 diff 拉進主對話——派 subagent 讀，回摘要與 file:line。

**違規判準**：主對話單一 tool result 超過約 200 行 → 這條沒守住。下次同類操作改派工或導檔。

## DIAG-2 最易失焦：自動壓縮吃掉驗收條件與中段決策

**症狀**：長任務後段 context 被壓縮，「當初的驗收條件」「中途的決定」變成模糊摘要 → 模型憑印象續作 → 走偏或自我宣告完成。

**為什麼嚴重**：壓縮不可避免；能做的是讓關鍵狀態活在壓縮殺不到的地方——repo 檔案。

**修法**：
1. 開工先在 `.claude/WORKLOG.md` 開一節（模板在該檔開頭）：目標、驗收條件、待辦。
2. 每完成一項就更新 WORKLOG（打勾＋一行結果），再開始下一項。
3. 發現前文變成摘要（被壓縮過）或 session 重啟：第一件事重讀 WORKLOG 最後一節，以它為準，不要信印象。
4. 一次只推進一個交付物。中途冒出的新想法寫進 WORKLOG 待辦，不要現在做。
5. 被 webhook 或使用者插話打斷：先花 30 秒把當前狀態寫進 WORKLOG，再處理插入的事。

**自我檢查**：「如果 session 現在被砍，下一個 session 能只靠 WORKLOG 接手嗎？」不能，就是寫得不夠。

## DIAG-3 最易出錯：無證據的完成宣告＋環境假設錯誤

**症狀 A（自驗偏誤）**：改完 code 自己看一眼覺得對就說完成——沒跑測試、沒實跑、沒讓 fresh context 的第二雙眼睛驗。
**症狀 B（環境假設）**：假設 `gh` 存在、假設某 model 可用、假設檔案在某路徑、忘記 push 就結束 turn——整包工作蒸發。

**修法**：
1. 完成的唯一定義：驗收條件逐條有證據。證據＝測試輸出、實跑結果、或 fresh-context agent 的 read-back（細則見 judgment.md JUDG-2）。宣告完成的訊息裡必須附證據；附不出來就還沒完成。
2. 環境事實查證的優先序（高→低）：
   - a. 本 session 的 tool schema 與 system-reminder（最權威）
   - b. 現場執行指令驗證（`command -v gh`、`ls 路徑`）
   - c. 官方文件（派 claude-code-guide 查，要求附 citation URL）
   - d. 訓練記憶——只能當線索，不能當依據
3. push 節奏：每完成一個交付物就 commit+push；turn 結束前跑
   `git log origin/$(git branch --show-current) -1 --oneline`
   確認遠端真的收到。
4. Edit 連續失敗 2 次（old_string 對不上）就停手：重新 Read 該區段，從 tool result 複製精確文字，不要憑記憶重打。

**違規判準**：說「完成」的那則訊息裡找不到任何指令輸出或 file:line 證據 → 違規，回頭補驗證。

## 本檔的極限（誠實條款）

以上對策補的是「執行紀律」。兩類問題它們補不了：
- **模糊需求**：驗收條件本身寫不出來時，紀律無法代替理解。處理方式見 judgment.md JUDG-3（停下來問使用者）。
- **品味與架構判斷**：checklist 驗得出「能不能跑」，驗不出「該不該這樣設計」。處理方式見 judgment.md 的「極限與代償」一節。
