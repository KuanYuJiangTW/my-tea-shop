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

### [2026-07-28] 資安修補（07-04 與 07-07 兩份報告的高風險項）
- 目標：把兩份資安評估的 Critical / High / Medium 項目修完並推上 main
- 驗收條件：
  - [x] SEC-001 後台 2FA 可完全繞過 → `8caea01`（otplib `verify()` 回傳物件不是 boolean；`admin_pending` 固定值 `"1"` 改 HMAC 簽章 token；2FA 端點補限流）
  - [x] H-2 admin API 缺 `withAdminAuth` → `e13650f`（12 檔 19 handler；新增靜態掃描測試防復發）
  - [x] H-1 Next.js 16.2.2 → 16.2.12 → `5d3153a`（報告建議的 16.2.10 不足，8 條 advisory 需 ≥16.2.11）
  - [x] M-1 cvs-callback 反射型 XSS → `d7f4515`（資料改進 data-* 屬性、script 用 nonce、CSP 移除 unsafe-inline）
  - [x] M-2 線上 RLS 唯讀複查 → `03b95b6` 新增 `supabase/rls-audit.sql`；小江實跑，orders 只剩 SELECT 政策、6/25 那 3 條危險寫入政策未復發
  - [x] 新發現 RPC 權限破口 → `50306cb` 新增 `supabase/rpc-grants-remediation.sql`；小江跑 STEP 2a 並驗收通過
  - [x] STEP 2b：`drop function decrement_stock(integer,integer)` 已刪（相依性掃描 pg_proc/pg_trigger 皆 0 筆；原始定義存於 `supabase/rpc-grants-remediation.sql` 附錄）。驗收：剩 4 個函式、security_definer 全為 false、權限只剩 postgres+service_role
  - [x] STEP 4：網站實測 4 項全過（下單扣庫存／後台取消還原庫存／後台登入 2FA／後台頁面瀏覽）——小江實跑確認
  - [x] 追加修復：2FA 時間容差 → `fbf2dd5`。小江回報 authenticator 驗證碼登不進後台，查出 otplib `epochTolerance` 預設 0（只收當下 30 秒窗），新增 `src/lib/totp.ts` 設為 `[30,30]`。此問題原被 `verify()` 型別誤用蓋住（任何碼都過），修掉誤用才浮現
  - [x] 追加確認：`validate_admin_session` 權限未被誤收（`anon=X` 仍在，與修補前一致）
- 決策紀錄：
  - git 歷史清理暫緩 —— 金鑰早已輪換，且小江決定 repo 維持公開當賣課教材。清理成本高（重寫 363 commit + 5 分支 force-push + 需開 GitHub Support ticket 才會真正消失）
  - `validate_admin_session` 刻意不收 anon 權限 —— proxy.ts 的 Edge middleware 是故意用 anon key 呼叫它，避免 service_role key 進 Edge Runtime。報告 L-6「明確只授權 service_role」的通則不可照抄，會導致後台完全登不進去
  - M-3（adminId 取自 body）暫不修 —— 改由 session 推導會連帶改後台 UI，且需先決定要不要做多管理員帳號，屬產品決策
  - 安全修正的完成判準：暫時退回舊碼、確認回歸測試會紅，才算數（已對 2FA、admin 授權、XSS 三項各做一次）
- 狀態：已完成（證據：362 測試全過、`tsc --noEmit` 零錯誤、`npm run build` 成功、RLS/RPC 驗收 SQL 輸出確認、STEP 4 網站實測 4 項全過）
  - 注意：`npm run lint` 已失效（Next 16 移除 `next lint`，且無 `eslint.config.js`），驗證改用 `tsc --noEmit`
