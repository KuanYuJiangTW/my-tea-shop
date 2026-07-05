# 模型調度守則（DISP）

> 主對話（指揮官）怎麼派工、選 model/effort、升降級、驗收。派工 prompt 的現成模板在 templates.md。
> 模型名稱與參數都以「你這個 session 的 Agent tool schema」為準——本檔寫的是 2026-07-05 驗證過的狀態，enum 可能變。

## DISP-1 指揮官不下場

主對話的工作是：拆任務、派工、整合結論、對使用者負責。以下粗活**一律派 subagent**，主對話只收結論：

| 粗活 | 派給誰 | 觸發門檻 |
|---|---|---|
| 掃 repo、找檔案、盤點某功能散在哪 | `Explore`（內建） | 要讀 3+ 檔或掃 2+ 不熟目錄 |
| 網頁研究、官方文件查證 | `general-purpose` 或 `claude-code-guide`（Claude 相關文件） | 任何需要上網的事 |
| 明確規格的實作、批次改檔 | `general-purpose` | 改 5+ 檔的機械性修改，或主對話 context 已經很滿 |
| 驗收任何交付物 | `checker`（本 repo 自訂，`.claude/agents/checker.md`） | 每次宣告完成前 |
| 第二意見、仲裁、卡死的難題 | `judge`（本 repo 自訂，`.claude/agents/judge.md`） | 高風險判斷或升級路徑走到頂 |
| 實作前的方案設計 | `Plan`（內建） | 跨 3+ 模組或動高風險區前 |

**反面界線（不要過度派工）**：讀一個已知路徑的小檔、跑一條指令、改一兩個檔的小修——主對話直接做。每次 spawn 都是冷啟動、要重建 context，2 分鐘內能做完的事不派。

## DISP-2 派工三件套

每個委派 prompt 必含三件事，缺一件就是廢 prompt：
1. **目標與動機**：做什麼＋為什麼（動機讓 subagent 在邊界情況做出對的取捨）
2. **驗收條件**：可驗證的清單（「test 全綠」「回答含 file:line」，不是「做好做滿」）
3. **回報格式**：明確規定回什麼、多長（見 DISP-4）

現成模板直接抄 templates.md，不要每次重發明。

## DISP-3 顯式指定 model 與 effort

**本環境已驗證的事實（2026-07-05）**：
- Agent tool 的 `model` 參數：當時 enum 為 `sonnet | opus | haiku | fable`。**派工前看你自己 session 的 Agent tool schema**，enum 以它為準；fable/mythos 級未必存在。
- Agent tool **沒有** per-call effort 參數。effort 只能寫在 `.claude/agents/*.md` frontmatter（`effort: low|medium|high|xhigh|max`，省略＝inherit）。
- 每次 Agent 呼叫都**顯式帶 model**（自訂 agent 用 frontmatter 內建值時可省略；per-call `model` 會覆蓋 frontmatter）。

**選型表（用最便宜的夠用款）**：

| 任務 | model | 理由 |
|---|---|---|
| 純定位／找檔案／grep 型問題 | `haiku` | 便宜快，錯了升級成本低 |
| 定位＋要理解語意、一般實作、驗收 | `sonnet` | 預設工作馬 |
| 已解出 pattern 的批次套用 | `haiku`（附精確 diff 模板）或 `sonnet` | pattern 明確時不需要智力 |
| 跨模組實作、難 debug、方案設計 | `opus` | sonnet 失敗後或事前判定就很難 |
| 仲裁、第二意見、多答案評審 | `judge`（opus + effort high） | 錯誤成本高的判斷 |
| enum 裡出現 fable/mythos 級 | 只用於 judge 型終審 | 太貴，不用於粗活 |

**skill 也是 effort 桿**：diff 審查用 `code-review`（可指定 low→max）；改動驗證用 `verify` skill；這些比自建流程可靠，優先用。

## DISP-4 回報合約

寫進每個委派 prompt 的規定（模板已內建）：
- 只回：結論、關鍵證據（`file:line` 或 ≤10 行指令輸出）、明確的 PASS/FAIL 或答案
- 禁止：整檔內容、完整 log、超過 300 字的敘述
- 長產物（報告、大 diff、清單）：寫成檔案，回傳路徑＋3 行摘要
- 有不確定就標「不確定：原因」，禁止編造補洞
- 沒找到／做不到就直說，並回報試過什麼——「查無」也是合格結論

## DISP-5 升降級路徑

**升級（失敗處理）**：
- `haiku` 失敗或驗收未過 **1 次** → 直接換 `sonnet` 重派（不給 haiku 第二次）
- `sonnet` 同一子任務失敗 **2 次** → 升 `opus`，且 prompt 必附**完整失敗軌跡**：做了什麼、錯誤訊息原文、已排除的假設。沒附軌跡的升級等於重擲骰子。
- `opus` 也失敗 → 停手，照 judgment.md JUDG-3 回報使用者，附三份失敗軌跡。**不要第四次。**
- 同一個方法最多兩輪。第二輪還敗，下一步只能「換方法」或「升級」，禁止同方法第三次（判斷「方向錯了」的訊號見 judgment.md JUDG-4）。

**降級（成功後的成本回收）**：
- 高階模型解出一個案例後，把解法寫成**精確模板**（含一個完成的 diff 範例＋適用清單）→ 交 `haiku`/`sonnet` 批次套用其餘案例 → `checker` 抽驗至少 2 個。
- pattern 模板不夠精確到「照抄就對」的程度，就還不能降級。

## DISP-6 驗證不自驗

**執行者不能當自己的驗收者。**驗收一律派 fresh-context agent（它不知道實作過程，只拿到驗收條件＋產物路徑）：

| 產物類型 | 驗法 | 誰驗 |
|---|---|---|
| 文件／規則檔 | read-back：讀檔逐條比對驗收條件，引 file:line 作證 | `checker` |
| 程式碼 | 主對話先跑 `npm run test`；行為驗證用 `verify` skill；diff 品質用 `code-review` skill | 測試＋`checker` 或 code-review |
| 高風險判斷（金流、庫存、auth、RLS、架構） | 第二意見：`judge` 獨立分析後比對；或派 3 個 sonnet 各自解，`judge` 評審選優 | `judge` |

checker 回報 FAIL 時：修完必須**再驗一次**，不能「我修好了所以過了」。
checker 回報 CANNOT VERIFY 時：先補可驗證性（加測試、補證據路徑），不是硬闖。
