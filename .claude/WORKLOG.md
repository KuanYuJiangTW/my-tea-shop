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

### [2026-07-29] 製茶過程頁多茶款擴充（openspec: tea-process-multi-tea）
- 目標：`/process` 從單一條烏龍流程，擴充為涵蓋店內全部 5 款實售茶的製程
- 驗收條件：
  - [x] openspec change 四件套齊備（proposal / design / spec / tasks）
  - [x] 製程事實經店主逐輪校對確認（非規劃者推論）
  - [x] 資料結構落地且測試釘住 design.md 1.2 矩陣
  - [x] i18n 文案擴充（zh/en 對稱，機械比對寫成常駐測試）
  - [x] 頁面實作（五茶切換、三段結構、四態渲染）
  - [x] HowTo 結構化資料（zh/en 各 5 份）
  - [x] 可及性與 RWD（完整 tabs pattern、375px 實測）
  - [ ] **未做：部署後抽查 production**（tasks 7.4，需先合併部署）
  - [ ] **未做：派 checker 獨立驗收**（tasks 6.4，見下方「交接注意」）
- 交付：`claude/tea-process-page-expansion-8qef3u` 共 5 個 commit（a034d51 為最新）
- 決策紀錄：
  - 不做 5 條獨立流程，改「共通前段 → 分歧段 → 共通後段」——五款茶只在中間分道揚鑣
  - 核心敘事＝**炒菁的位置**（最前＝烏龍／無＝紅茶／最後＝紅烏龍）
  - 製程參數採方案 B（不寫溫度時數），強制以「判斷依據」取代。**既有 8 步的 detail 原本全是溫度時數，已全面改寫**
  - 路由維持單頁，不做 `/process/[tea]` 子頁
  - 四季春（名間松柏嶺）與紅烏龍（鹿野）為合作茶農，加來源徽章主動標示
  - 設備具名寫內文，但**設備不佔工序層級**——擠壓不獨立成步驟
- **修掉的線上不實宣稱**：原 `steps.sort` 寫「師傅逐一手工揀除」，實情是粗選機與鼓風機。已改為具名機器並加測試防回退
- 規劃者被店主更正的事實（供後人警惕）：
  - 蜜香紅茶是**球形**紅茶非條型；紅烏龍分歧段是「揉捻→發酵→炒菁」
  - 焙火**不是共通工序**（四季春不焙、高山烏龍選配）
  - 揀枝在乾燥時同步進行，非最後一步；金萱淺焙使奶香**轉為奶油香而非消失**
- 自己寫出來又抓到的 4 個 bug（都已修）：
  1. 對照表左上角格子誤印「製法家族」，與第一列列標題重複
  2. hash 切換失效——只在 mount 讀 `location.hash`，站內再點 `#redOolong` 不會換茶（缺 `hashchange` 監聽）
  3. HowTo 名稱把「的製作過程」寫死在模板，EN 站印出「High Mountain Oolong的製作過程」
  4. HowTo 品名未依規格對齊 `products.ts`；四季春產地少了「南投」
- 驗證證據：`npm run test` 27 檔 345 測試全綠（基準 26 檔 316，+1 檔 +29 測試）；`npm run build` 成功；zh/en 實跑皆 200 且零 `MISSING_MESSAGE`；Playwright 實測四態渲染、切換不重設捲動、hash 進站、鍵盤 tabs、375px RWD 全通過
- **交接注意（下一個 session 請先看這段）**：
  1. `npm run lint` 在本 repo **完全跑不起來**（`next lint` 已被 Next 16 移除且無 eslint 設定檔）。CLAUDE.md 技術事實與 judgment.md JUDG-5 都還把它當驗證手段，照做會卡住。詳見 lessons.md 同日條目
  2. `e2e/` 有 6 個 spec 但 `package.json` **沒有 playwright 依賴**，e2e 跑不了。本次驗證是把 playwright 裝在 scratchpad 獨立 package（未動 repo 依賴）
  3. tasks 6.4 要求派 `checker` 獨立驗收，**本次未執行**——本 session 的執行環境指示為「未經使用者要求不得派 subagent」，與 CLAUDE.md 鐵律 2 衝突時以前者為準。已改為主對話內逐條實跑並附證據。若要照規格補派 checker，需使用者明示
  4. tasks 0.10 仍待店主校對：design.md 1.4 節「工藝取捨」其餘各則的事實正確性（蜜香紅茶不用藥、紅烏龍炒菁分水嶺、高山烏龍看天萎凋、四季春多次採收）。**這幾則已經寫進頁面文案並上了 commit**，若店主校出錯誤需回頭改 `craftNote.*`
  5. 另案待決：0.5.1 高山烏龍生茶/焙茶兩種賣法未進 products.ts、0.5.2 lint 修復、0.5.4 e2e 依賴
- 狀態：**實作完成待審**（第 0–6 節除 6.2/6.4 外全數完成；第 7 節僅剩部署後抽查）
