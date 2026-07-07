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

---

### [2026-07-07] Production 資安評估 + 可行改善計畫文件
- 目標：對 server 架構與程式架構做全面資安評估，產出「可行的改善計畫」文件；**唯讀分析，不動線上資料與用戶隱私**
- 驗收條件：
  - [ ] 涵蓋四域：A 認證/授權/2FA/RLS、B 金流/金額完整性、C 密鑰/設定/cron/基建、D 輸入驗證/注入/上傳/XSS/限流
  - [ ] 每項發現有 file:line 證據與嚴重度分級；無虛構（checker 複驗）
  - [ ] 改善計畫「可行」：分優先級、每項含具體修法/驗收，執行可交日常模型
  - [ ] 文件產出並 commit+push 到 claude/production-security-assessment-bcb5bj
- 決策紀錄：
  - 全程唯讀靜態分析（讀 code/config/SQL），不連 production DB、不 dump 用戶資料——符合使用者鐵律
  - 依四域平行派 4 個 general-purpose(sonnet) subagent 取證，主對話做跨域組合風險綜合（DISP-1）
  - 【關鍵仲裁】B agent 誤判「無 middleware＝admin 可匿名利用」；查證 Next 16 已將 middleware 更名 proxy.ts，故 src/proxy.ts 為生效 middleware→無 guard 的 admin route 平時受保護；但 next@16.2.2 命中 middleware-bypass CVE(CVE-2026-44575)，與漏掛 guard 疊加才是真風險。三個爭議最大發現(SEC-001/004/007/022)主對話已親自覆核原始碼。
- 產出：docs/security/2026-07-07-security-assessment.md（診斷，27 findings：3C/6H/10M/8L）＋ 2026-07-07-improvement-plan.md（P0–P3 可執行工單）
- 狀態：✅ 已完成。證據：checker read-back 14 條承重宣稱全 PASS（含 SEC-001/002/003/004/005/006/007/022 及 4 項正面確認 file:line 皆與原始碼一致，無虛構）；兩文件已 push 到 origin/claude/production-security-assessment-bcb5bj（commit 21aafdb）
- 未做（依約定）：未開 PR（使用者未要求）、未動 main、未連線上 DB／未讀用戶資料。SEC-002/010 等「需站方 Dashboard 確認」項已列入報告 §6
