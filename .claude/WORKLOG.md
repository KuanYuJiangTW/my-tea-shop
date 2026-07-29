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
  - [ ] i18n 文案擴充（第 2 節）
  - [ ] 頁面實作（第 3 節）
  - [ ] HowTo 結構化資料（第 4 節）
- 待辦：見 `openspec/changes/tea-process-multi-tea/tasks.md`，下一步是第 2 節 i18n
- 決策紀錄：
  - 不做 5 條獨立流程，改「共通前段 → 分歧段 → 共通後段」——五款茶只在中間分道揚鑣
  - 核心敘事＝**炒菁的位置**（最前＝烏龍／無＝紅茶／最後＝紅烏龍）。此為店主提供實際順序後才浮現，初稿的「炒菁的有無」已升級
  - 製程參數採方案 B（不寫溫度時數），但強制以「判斷依據」取代，不得寫成含糊句
  - 路由維持單頁，不做 `/process/[tea]` 子頁——參數不寫的前提下子頁內容量不足，且「差別在中間」的對比只有同頁成立
  - 四季春（名間松柏嶺）與紅烏龍（鹿野）為合作茶農，加來源徽章主動標示，敘事定調「每一款茶都選它的原產地」
  - 設備具名（甲種乾燥機／擠壓機／粗選機／鼓風機／箱型焙茶機）寫內文，但**設備不佔工序層級**——擠壓不獨立成步驟
- 規劃者被店主更正的事實（供後人警惕：這些都是我推論錯、店主指正的）：
  - 蜜香紅茶是**球形**紅茶非條型（第一天烏龍、第二天紅茶、再回布球團揉）
  - 紅烏龍分歧段是「揉捻→發酵→炒菁」，非「發酵→炒菁→揉捻」
  - 焙火**不是共通工序**（四季春不焙、高山烏龍選配）
  - 揀枝在乾燥時同步進行，非最後一步；焙完直接包裝
  - 金萱淺焙使奶香**轉為奶油香而非消失**，唯重焙才會被蓋掉
- 待店主確認（擋上線，不擋實作）：見 tasks 0.10
- 環境發現：`npm run lint` 在本 repo 完全不可用（詳見 lessons.md 2026-07-29 條）
- 狀態：進行中（第 0、1 節已完成。證據：`npm run test` 27 檔 337 測試全綠；`npm run build` 帶 placeholder env 成功且 `/process` 在路由表）
