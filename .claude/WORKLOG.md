# WORKLOG — session 工作狀態（context 壓縮與斷線的保險）

> 用法：大任務開工先照模板開一節；每完成一項就更新；session 重啟或發現前文被壓縮成摘要時，先讀最後一節再動工。
> 清理規則：超過 10 節時，把「已完成」的舊節各壓縮成一行結論（規則見 playbooks/maintenance.md）。

## 模板（複製這段開新節）
```
### [YYYY-MM-DD] 任務名
- 目標：一句話
- 驗收條件：
  - [ ] 可驗證的條件（不是「做好」而是「npm run test 全綠」這種）
- 待辦：
  - [ ] …
- 決策紀錄：重要決定一行一個（為什麼選 A 不選 B）
- 狀態：進行中 ／ 已完成（證據：指令輸出或 file:line）
```

---

### [2026-07-05] 建立制度檔案（Fable 5 建制 session）
- 目標：把判斷力固化成 repo 內制度檔，供未來較小模型的 session 沿用
- 驗收條件：
  - [x] A 環境診斷 → .claude/playbooks/diagnosis.md
  - [x] B CLAUDE.md 重寫為路由
  - [x] C 模型調度守則 → dispatch.md（含 agents/checker.md、agents/judge.md）
  - [x] D 判斷力外化 → judgment.md
  - [ ] E 派工模板 → templates.md
  - [ ] F 維護協議 → maintenance.md + lessons.md
  - [x] G 給未來 session 的信 → letter-to-future-sessions.md
  - [x] 收尾①：checker 對抗審查（FAIL 2 項：缺 citation URL、skill 引用無查證法）→ 已修正
  - [x] 收尾②：機械 read-back（13 檔皆在遠端、行數合規、本地遠端零差異）
  - [x] 收尾③：checker 複驗 2 項修正 PASS；其 meta 發現（letter 本文被改）以交接區更正註記處理
- 決策紀錄：
  - .gitignore 原本整包忽略 .claude/，已改為白名單制（agents/playbooks/backups/WORKLOG 可提交）
  - 路由表用純文字路徑，不用 @import（官方文件確認 @ 會 eager load，深度 4 層）
  - subagent frontmatter 欄位已向官方文件查證：model 可用 sonnet/opus/haiku/inherit 等，effort 可用 low/medium/high/xhigh/max，預設 inherit
  - 制度檔語言：繁中敘述＋英文技術名詞（維護者讀繁中；工具名保持原文避免歧義）
- 狀態：已完成（證據：checker 初審 FAIL 2 項→修正→複驗 PASS；13 檔皆在 origin 分支上；`npm run test` 26 檔/316 測試全綠實測）

### [2026-07-29~30] 製茶過程頁多茶款擴充（openspec: tea-process-multi-tea）
- 目標：`/process` 從單一條烏龍流程，擴充為涵蓋店內全部 5 款實售茶的製程
- 交付：`claude/tea-process-page-expansion-8qef3u` 共 8 個 commit（最新 `08db4d6`）
- 驗收條件：
  - [x] 資料結構、i18n（zh/en 對稱）、頁面實作、HowTo 結構化資料、可及性與 RWD 全數完成
  - [x] checker 獨立驗收已跑（結果與處置見下）
  - [x] 店主校對工藝取捨文案完成（四處更正已套用）
  - [ ] **未決：6.6.4 規格自我矛盾待店主裁決**（見下）
  - [ ] 未做：部署後抽查 production（tasks 7.4）
- 核心設計：不做 5 條獨立流程，改「共通前段 → 分歧段 → 共通後段」；核心敘事＝**炒菁的位置**（最前＝烏龍／無＝紅茶／最後＝紅烏龍）
- 順手修好的既有問題：
  - `npm run lint` 一直跑不起來（script 是被 Next 16 移除的 `next lint`，且無 eslint 設定檔）。已補 `eslint.config.mjs`、`eslint-config-next` 升到 16.2.12、script 改為 `eslint`。**CLAUDE.md 與 judgment.md 不需改——修好後它們寫的就是真的了**
  - 線上不實工藝宣稱「師傅逐一手工揀除」（實情是粗選機與鼓風機），已改為具名機器並加測試
- **我自己犯的錯（8 個，都已修，供後人警惕）**：
  1. 對照表左上角格子誤印「製法家族」，與列標題重複
  2. hash 切換失效——只在 mount 讀 `location.hash`，缺 `hashchange` 監聽
  3. HowTo 名稱把「的製作過程」寫死在模板，EN 站印出中文
  4. HowTo 品名未依規格對齊 `products.ts`；四季春產地少「南投」
  5. **把規格「方案 B」誤讀為全面禁用參數，刪掉 6 步店主已確認的溫度時數，還寫測試把違規釘成正確**——測試全綠反而掩護了規格違反（最嚴重，checker 抓到）
  6. 對照表漏渲染「浪菁」欄，`matrix.rowShake` 成為孤兒 key（checker 抓到）
  7. **推論出「要蜜香就不能用藥」這句帶合規風險的農藥宣稱**（店主校對抓到）
  8. `react-hooks/set-state-in-effect`：用 effect 修正另一個 state（lint 抓到，tsc 與測試都抓不到）
- checker 驗收結果：3 條 FAIL，查證後 2 條有效已修（第 5、6 項），1 條為**規格自我矛盾**
- **交接注意（下一個 session 先看這段）**：
  1. **tasks 6.6.4 待店主裁決**：規格 Scenario「切換茶款時共通段不動」與同一份規格的焙火要求（`roast` 屬共通後段卻須因茶而異）互相矛盾，也與店主校對過的 design.md 1.2 矩陣（`pick` 於蜜香紅茶為強化）矛盾。我研判應修規格措辭為「步驟組成不變」，未擅自改規格也未刪除著蜒事實。**tasks 0.11（四季春機採要不要在 pick 加 accent）等這項裁決才能動**
  2. **tasks 0.5.5**：全 repo 尚有 22 個既有 lint error（13 檔），店主已裁示另立 change。tasks 內有依規則與依檔案的完整清冊，已分三批（金流／admin／前台），可直接照著開工
  3. **tasks 0.5.6**：e2e 要真正接通需五步（補依賴→修路由→加 data-testid→備測試帳號→加 script＋CI），店主已裁示另立 change。現況已寫進 `e2e/README.md`。建議第一步先為 `/process` 寫 spec（不需登入、不碰 DB）
  4. tasks 0.5.1 高山烏龍生茶/焙茶兩種賣法未進 `products.ts`，仍待店主確認
  5. **農藥／有機／認證／產地／療效這類宣稱，一律不得由推論產生**（lessons.md 2026-07-30 條）
- 驗證證據：`npm run test` 27 檔 353 測試全綠（基準 26 檔 316）；`npm run lint` 本次 diff 零 error 零 warning，並依 JUDG-2 做過機械歸屬對比；`npm run build` 成功；zh/en 實跑皆 200 且零 `MISSING_MESSAGE`；Playwright 實測四態渲染、切換不重設捲動、hash 進站、鍵盤 tabs、375px RWD、五份 HowTo 順序、更正後文案全數通過；關鍵測試均做過變異測試確認非空轉
- 狀態：**實作完成待裁決**（僅 6.6.4 一項擋住收尾）
