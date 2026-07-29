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

---

### [2026-07-28] 資安清尾：M-3 與 L 級項目
- 目標：把資安報告剩餘的 M-3 與 L 級 7 項處理完或做出明確結論
- 驗收條件：
  - [x] M-3 稽核來源可偽造 → `f3321fb`。admin_id 改由 getAdminActor() 從 session 推導（回傳 token 的 SHA-256 前 12 碼）。不必等多管理員決策——那是兩件事
  - [x] L-5 TOTP 防重放 → `f3321fb`。借 rate_limits 以 max=1 做單次使用標記，key 為 secret+code 雜湊
  - [x] L-7 sanity-webhook 改 HMAC → `f3321fb` 實作 → `70fe6d1` 修時間戳單位 → `cb1b454` 移除舊密鑰退路。小江已於 Sanity 後台填 Secret，實測 POST 200 無 warning
  - [x] L-8 上傳驗 magic bytes → `f3321fb`。檢查 JPEG/PNG/WebP 檔頭，副檔名與 contentType 改用檔頭判定結果
  - [x] L-2 輸入驗證一致性 → `b88504f`。新增 src/lib/validate.ts，套用於 reviews 與後台 coupons/campaigns
  - [x] L-6 rate_limit RPC 權限 → 已於 RPC 修補那輪完成
  - [x] L-1 相依套件 → 結論：不處理（見決策紀錄），教訓已記入 lessons.md
  - [x] L-4 CSP unsafe-inline → 結論：維持現狀（見決策紀錄）
  - [x] L-3 PII → 驗證與遮罩已完成（`c7232f3`）。**到期清除機制刻意不做**：小江 2026-07-29 表示保單的名冊保存要求不確定，先不動。此為明確決定而非待辦，查證結果（個資法第 11 條第 3 項為「刪除／停止處理／停止利用」三擇一、部分遮蔽不等於去識別化、施行細則未定 log 年限）已寫在 `src/lib/pii.ts` 檔頭，日後要做時直接看那裡
- 決策紀錄：
  - **L-1 不跑 npm audit fix**：`--force` 會把 Next.js 降到 9.3.3（npm 找不到向前路徑時的建議）；不加 force 則改動 328 個套件卻修掉 0 個漏洞（42 → 42）。18 個 high/critical 中 17 個在 @sanity/cli 工具鏈或 PostCSS/Tailwind（建置期），唯一有執行期路徑的 sharp 卡在 Next 的 optionalDependencies `^0.34.5`（修補版 0.35.0 升不上去），屬上游問題
  - **L-4 保留 unsafe-inline**：小江表示當初為其他原因加上。查證後確認：CSP Level 2 起，script-src 有 nonce 時瀏覽器會忽略 unsafe-inline，故現代瀏覽器實際只認 nonce，保留它的暴露面僅剩不支援 nonce 的老瀏覽器。**不可照 openspec/specs/csp-nonce/spec.md 補上 strict-dynamic**——那會讓 host 白名單失效，GA 與 Cloudflare Insights 會掛掉。建議改規格對齊現況
  - /studio 有獨立的寬鬆 CSP（next.config.ts，unsafe-inline + unsafe-eval + https:）且不在 proxy.ts 的後台保護清單內（靠 Sanity 自身登入）。Studio 本來就需要 eval，維持現狀但需知情
  - M-3 的 getAdminActor() 日後改多管理員時只需改回傳值，呼叫端不動
- 狀態：已完成（證據：416 測試全過、`tsc --noEmit` 零錯誤、`npm run build` 成功）

---

### [2026-07-29] 把 session 教訓固化成 hook / command / skill / rule
- 目標：依「規則→CLAUDE.md、重複 prompt→command、該想起的能力→skill、必須發生的動作→hook」把資安 session 的教訓institutionalise。專案原本零 hook
- 驗收條件：
  - [x] Hook 攔截危險指令 → `cad08e0`（`.claude/settings.json` + `.claude/hooks/guard-commands.js`）。用 node 而非 jq（本機無 jq，2026-07-29 實測）
  - [x] Hook 補上執行包裝器漏擋 → `8754e69`。`bash -c` / `sh -c` / `eval` 內的字串會被執行，不可當字面量剝掉
  - [x] `/verify` command → `cad08e0`（`.claude/commands/verify.md`），含「npm run lint 已失效、不要去修它」
  - [x] `reverse-verify` skill → `cad08e0`（`.claude/skills/reverse-verify/SKILL.md`）
  - [x] JUDG-6（收緊權限前查呼叫點）、JUDG-7（引用外部規範前查第一手來源）→ `cad08e0`
  - [x] JUDG-5 移除已失效的 `npm run lint`；CLAUDE.md 與 templates.md 的 3 處殘留一併修正
  - [x] `.gitignore` 白名單補 `commands/` `skills/` `hooks/` `settings.json`（原本會靜默忽略整批新檔，由 lessons 的 check-ignore 規則抓到）
  - [x] **guard hook 測試 26 案例全過**（2026-07-29 實跑，exit=0）：11 條應攔截、15 條應放行（其中 8 條專防誤擋）
- 決策紀錄：
  - **不新增 subagent** —— checker + judge 已覆蓋本 session 的需求，硬加「資安稽核員」只會與 checker 職責重疊，讓未來 session 不知道該派誰
  - **hook 不是安全邊界，是防手滑的護欄** —— 拆字串拼接或直接改 settings.json 都能繞過，這是刻意的。它要攔的是「看到 42 個漏洞反射性打出 audit fix」那一瞬間
  - 攔截型 hook 必須先剝離 heredoc 與引號內容再比對，否則會擋住「提到該指令」的正常操作（實作當下就擋掉了說明自己的 commit 與自己的測試腳本兩次，教訓已記入 lessons）
  - hook 改動的驗收判準：`node .claude/hooks/guard-commands.test.js` 全過，且能通過「用它自己的說明文字當 commit 訊息」這一關
- 狀態：已完成（證據：26 案例測試全過 exit=0；hook 實跑確認會攔 `npm audit fix` 並顯示完整理由，且不誤擋 `npm audit --json`；含 4 次觸發字串的 commit 訊息成功推送）
