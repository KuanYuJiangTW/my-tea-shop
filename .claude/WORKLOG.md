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
### [2026-07-29~30] 製茶過程頁多茶款擴充（openspec: tea-process-multi-tea）
- 目標：`/process` 從單一條烏龍流程，擴充為涵蓋店內全部 5 款實售茶的製程
- 交付：`claude/tea-process-page-expansion-8qef3u` 共 10 個 commit
- 驗收條件：
  - [x] 資料結構、i18n（zh/en 對稱）、頁面實作、HowTo 結構化資料、可及性與 RWD 全數完成
  - [x] checker 獨立驗收已跑（結果與處置見下）
  - [x] 店主校對工藝取捨文案完成（四處更正已套用）
  - [x] 6.6.4 規格自我矛盾已由店主裁決修正措辭為「步驟組成不變」，0.11 四季春機採一併加上
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
  1. ~~tasks 6.6.4 規格矛盾~~ **已解**（2026-07-30 店主裁決）：`spec.md` 措辭改為「共通前後段的**步驟組成**（步驟集合與順序）保持不變」，並明文允許共通段的個別工序帶該茶專屬的 `accent`／`optional`／`skipped`，附「措辭沿革」註記避免後人重踩。0.11 四季春機採（`pick: accent` ＋ 專屬文案）一併加上。三條新測試釘住新規則
  2. **tasks 0.5.5**：全 repo 尚有 22 個既有 lint error（13 檔），店主已裁示另立 change。tasks 內有依規則與依檔案的完整清冊，已分三批（金流／admin／前台），可直接照著開工
  3. **tasks 0.5.6**：e2e 要真正接通需五步（補依賴→修路由→加 data-testid→備測試帳號→加 script＋CI），店主已裁示另立 change。現況已寫進 `e2e/README.md`。建議第一步先為 `/process` 寫 spec（不需登入、不碰 DB）
  4. ~~tasks 0.5.1 高山烏龍生茶/焙茶兩種賣法未進 `products.ts`，仍待店主確認~~ **已結案，此行過期**（2026-08-01 修正）：`tasks.md` 0.5.1 於 2026-07-30 經店主確認結案，結論是 **`products.ts` 不必改**——變體目前只有重量一維且綁在 id 位移上供結帳算運費，加焙度會變成二維變體，要動 id 配置、庫存欄位與運費計算；既然生茶不上架就不必付這個代價。當時要修的是文案（已改為明講「網站販售一律淺焙」並加 4 條測試釘住）
  5. **農藥／有機／認證／產地／療效這類宣稱，一律不得由推論產生**（lessons.md 2026-07-30 條）
- 驗證證據：`npm run test` 27 檔 358 測試全綠（基準 26 檔 316）；`npm run lint` 本次 diff 零 error 零 warning，並依 JUDG-2 做過機械歸屬對比；`npm run build` 成功；zh/en 實跑皆 200 且零 `MISSING_MESSAGE`；Playwright 實測四態渲染、切換不重設捲動、hash 進站、鍵盤 tabs、375px RWD、五份 HowTo 順序、更正後文案全數通過；關鍵測試均做過變異測試確認非空轉
- 狀態：**實作完成**。第 0–6 節全數結案（6.2 lint 已修復並通過）；僅剩 7.4 部署後抽查 production 待合併後執行

### [2026-07-31] 製茶過程文案：店主二次校對＋文案修飾
- 觸發：店主指出改版後的製程描述不如原版精確，並附茶改場與網路製茶資料逐條更正
- 交付：`claude/tea-process-multi-tea` 兩個 commit（`afbbde2` 事實更正、`1bf4465` 文案修飾），依序併入 #3 `claude/lint-debt-cleanup`、#4 `claude/cart-hydration-fix`
- **事實更正（以店主提供的資料為準，不得再由推論改回）**：
  1. 採摘基準 **一心二葉 → 一心三葉到一心四葉**；過嫩是「滋味強但容易苦澀、不好製茶」，過老才是「滋味粗薄」（原文把兩者寫反）
  2. 日光萎凋：日照強時**鋪厚**而非攤薄（原文寫反）；陰天攤薄或拉長時間；時間 1-2 小時 → **20 分鐘至 1 小時多**
  3. 揉捻：**持續揉捻 3-5 分鐘**，不是「反覆 3-6 次、每次 20-30 分鐘」（原文把布球團揉的循環誤植到揉捻）
  4. 布球團揉：反覆「幾十趟」→「幾趟」
  5. 炒菁併入高溫鐵鍋、激發炒香與固定香氣、去除青草味
  6. 包裝標示：品質標示 → 品名、產地等等
- **順手抓到的資料模型錯誤**：紅烏龍的 `roll` 原為 `common`，會套用共通段「炒菁後趁熱揉」的文案——但它炒菁在最後，走的是紅茶那套先揉捻破壁再重發酵，等於對客人講錯順序。已改為 `accent` 並補專屬文案（zh/en），對應測試由 `roll:common` 改為 `roll:accent`
- **連動更新**：四季春機採文案與 `tea-process.test.ts` 的採摘基準正規表示式、`about.galleryPhotos.picking2` 照片說明，一併對齊新基準
- 文案修飾（店主要求，事實層面不動）：頁面標語改掉「職人的心意與百年傳承」套話、體驗預約與購買提示改為行動導向、每一步收尾改為指向「這對杯子裡的茶有什麼影響」
- 驗證證據：`npm run test` 34 檔 465 測試全過；`tsc --noEmit` 零錯誤；`npm run build` 成功（容器無 secrets，需自備 placeholder env 才跑得起來，與改動無關）；zh `/process`、en `/en/process`、zh `/about` 實跑 200 且零 `MISSING_MESSAGE`；新舊文案逐條 grep 對照確認
- **店主看 preview 後的第二輪回報（同日）**：
  1. **蜜香紅茶的浪菁套到烏龍文案**——共通段浪菁通篇講「烏龍最關鍵的一步」「一款烏龍最後是清雅還是濃烈」，在紅茶頁上自相矛盾。`black.overrides` 補 `shake: "accent"` 並加專屬文案（zh/en）。教訓同紅烏龍的 `roll`：**共通段文案只要出現茶類名稱，就要回頭檢查五款茶是否都成立**
  2. **導覽列沒置中**（改版前是置中的）——茶款列與工序列都對 `overflow-x-auto` 容器直接下 flex，內容放得下時會靠左。修法是把捲動容器與 flex 分開，內層用 `w-max mx-auto`：放得下置中、放不下才從左邊捲。**不可直接對 overflow 容器下 `justify-center`**，那會讓溢出的左半邊捲不到
- 版面驗證證據：Playwright 實測 1920px 下茶款列與工序列中心皆為 960（＝viewport 中心）；375px 下 `scrollWidth 416 > clientWidth 343` 且 `scrollLeft 0`，確認溢出時從左起捲未被裁切；蜜香紅茶頁殘留「烏龍最關鍵的一步」計數為 0
- 狀態：已完成

### [2026-08-01] 三個 stacked PR 合併上線
- 交付：#2 `90dab5d`、#3 `077a1d7`、#4 `5cb9808` 依序合併進 main（main 由 `d2fa997` → `5cb9808`），正式站已更新
- 驗收條件：
  - [x] 三個 PR 的 Vercel checks 全綠才合併
  - [x] `git merge-base --is-ancestor` 逐一確認三個分支的內容都在 main 上
  - [x] **tasks 7.4 部署後抽查 production 已完成**（店主實測）：`/process` 與 `/en/process` 各五份 HowTo 齊全，步數 11／11／10／11／12 中英一致；英文站印出英文品名無中文殘留；導覽列置中、五款茶頁籤、炒菁設備、蜜香紅茶浪菁、紅烏龍揉捻文案皆確認正確
  - [x] 購物車回歸（加入／移除／改數量／清空、重新整理保留、Header 徽章一致、登入前後同步）店主實測通過
- **合併時踩到的坑（下次做 stacked PR 必看）**：合併 #3 之後，#4 的 base **不會**自動改指 main——GitHub 只有在 base 分支被刪除時才自動 retarget。當時 #4 的 base 仍是 `claude/lint-debt-cleanup`，直接合下去會併進那條分支、根本上不了線。**必須先用 `update_pull_request` 把 base 改成 main 再合**
- 已知的環境限制：本容器的網路政策擋掉 `*.vercel.app` 與 `taiwantea.store`（proxy 回 403 policy denial），所以 preview 與 production 的實際頁面一律無法由 agent 抽查，只能由店主看。要驗頁面內容請改用本機 `npm run build && npm start` 打 localhost
- 驗證 production HowTo 的方法（存查）：在該頁 Console 執行
  `[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)).filter(x=>x['@type']==='HowTo').map(x=>[x.name,x.step.length])`
- 尚未處理（都不擋營運）：
  1. **Supabase Auth 的 preview redirect 白名單**：`Authentication → URL Configuration → Redirect URLs` 未含 Vercel preview 網域，導致 preview 上的 Google 登入與 Magic Link 會被導回正式站（Supabase 比對不到就退回 Site URL）。程式碼本身正確（`LoginForm.tsx:94` 用 `window.location.origin`），要加的是 `https://my-tea-shop-git-*-jiangkuanyus-projects.vercel.app/**`。**密碼登入不受影響**（走 `router.push` 相對路徑），preview 要測登入狀態請用密碼登入
  2. tasks 0.5.5 全 repo 既有 lint error 的批次 B／C（批次 A 已於 #3 清償）
  3. tasks 0.5.6 e2e 接通（五步，現況見 `e2e/README.md`）
- 狀態：已完成

---

### [2026-08-01] 超商店到店可用性核實與修正
- 目標：核實「四大超商店到店 ＋ 貨到付款」的實際可用組合，修正結帳頁與後端驗證
- 驗收條件：
  - [x] OK 超商全面移除 → `3e3992a`。綠界電子地圖對 OKMARTC2C 回「OK超商暫停服務(若有寄件需求，請使用711、全家、萊爾富)」，30 bytes，不分 IsCollection 帶 N 或 Y（以正式金鑰實測 4 子類型 × N/Y 共 8 次）
  - [x] 超商可用性收斂成單一事實來源 → `3e3992a` 新增 `src/lib/cvs.ts`。四支下單 API 原本各自複製一份 `VALID_CVS` 陣列，改用共用 `isValidCvs()`
  - [x] 萊爾富維持可用且可貨到付款 → 綠界官方 C2C 測試特店（2000933）對 logistics-stage 送 `HILIFEC2C + IsCollection=Y`，建單成立（AllPayLogisticsID=3603946）。對照組：同參數改門市代號為不存在值 → `0|門市不存在`，確認「成立」不是照單全收
  - [x] `IsCollection` 不再寫死 `"N"` → `3e3992a`。改依付款方式帶值
  - [x] 顯示用對應表保留 `"ok"` 鍵（email、會員中心、後台訂單頁）→ 歷史訂單的超商欄位才不會變空白
  - [x] 教訓入 lessons → `7a91a18`（2 條，含備份）
- 決策紀錄：
  - **不投資源解 OK**：那是綠界伺服器端的回應，本站無施力點。綠界的服務介紹頁、費率表、電子地圖 API 文件三者都已把 C2C 收斂成三家，只剩門市訂單建立文件還列著 OKMARTC2C ——是下架不是維護。且 OK 全台約 700 家且逐年下滑（統一超 8,282／全家 4,470／萊爾富 1,800+），補回來只多約 5% 門市覆蓋，另串 OK 或別家整合商的成本完全不成立。恢復判定方式：重打電子地圖 API，回應不再是「暫停服務」即可；加回來的成本是 `src/lib/cvs.ts` 一行 ＋ `src/types/index.ts` 一個字面量
  - **可代收清單與可選清單刻意分開維護**：兩者曾各自變動（OK 整個停掉）。目前三家皆可代收，故 UI 過濾與路由層 `cvsSupportsCod` 防線暫無可觸發的真實輸入，改由單元測試守住
  - **萊爾富代收的爭議是兩種服務被混為一談**：走櫃台自填單的散客店到店不代收；綠界 C2C 的代收金額是賣家在後台建單時填的，門市櫃台不經手（費率表註2「超商門市人員不會先行收取物流運費」）。小江查綠界後台確認代收欄位可填後定案
  - 萊爾富 C2C 材積比別家嚴（總重 ≧40 公克且 ≦5 公斤，7-11／全家為 10 公斤），大單會先卡在這裡，與代收無關
- 本 session 期間獨立發現、已由他人修掉的：vitest 把 `.claude/hooks/guard-commands.test.js` 當測試檔掃進來，導致 `npm run test` 自 `cad08e0` 起一直偽紅。曾開任務卡片，rebase 時發現遠端 `0a6b08a` 已修（vitest 與 eslint 一併排除 `.claude`），卡片已撤
- rebase 到 main 之後才發現的自己的錯：貨到付款的超商重置原本寫成 useEffect，被新修好的 `npm run lint` 抓到兩個 error——(1) effect 寫在 `form` 的 useState 之前，`setForm` 處於 TDZ；(2) 移到宣告後仍違反 `react-hooks/set-state-in-effect`。改放付款方式的 onChange 事件處理器解決（`1cb6a27`）。**tsc 與 476 條測試都抓不到這兩個**，與 lessons「eslint-config-next 帶進的 react-hooks 規則抓到 tsc 抓不到的 bug」同一類
- 狀態：已完成（證據：rebase 並 `npm ci` 同步依賴後重驗——476 測試全過（35 檔）、`tsc --noEmit` 零錯誤、`npm run lint` 0 error（36 warning 皆為既有的清償待辦）、`npm run build` 成功；綠界正式環境地圖探測 8 次、測試環境建單探測 7 次）

---

### [2026-08-01] 取消訂單的優惠還原修正
- 目標：小江回報「取消訂單時點數／折價券應該要返還」，查證並修正
- 驗收條件：
  - [x] 查證：確認兩個真 bug → 用 mock Supabase 實跑真正的路由，攔截 `refundPoints` 收到的參數
  - [x] Bug 1 會員自助取消只退 1% 點數 → `ebfd509` 初修、`4217a62` 更正。`orders/[id]/cancel` 的 SELECT 沒撈 `points_discount`，`points_discount ?? floor(points_used/100)` 永遠落到舊制 fallback。實測 500 點只退 5 點
  - [x] Bug 2 通用碼永不還原 → `ebfd509`。`orders.coupon_id` 同時存 `coupons.id` 與 `coupon_templates.id` 且無欄位分辨，原本只 update `coupons`（遇通用碼靜默 no-op）。改為同時 `coupon_usages.delete().eq("order_id", id)`，兩條取消路徑都補
  - [x] 真回歸測試 → `src/__tests__/orders/cancel-order.test.ts` 12 條。DB mock 刻意只回傳 `select()` 指名的欄位，讓「忘了 select」這類錯自然變紅
  - [x] **反向驗證三次全過**：退回退點修正 → `expected 5 to be 500`、`expected 500 to be 50000`；退回會員取消的 usages 刪除 → 2 紅；退回後台的 → 1 紅；改回全綠
  - [x] 稽核／補償 SQL → `supabase/audit-cancelled-order-refunds.sql`
  - [x] **小江已跑完全部 7 段**。盤點結果：8 筆訂單、2 個 user_id、共 105 點。**兩個帳號都是小江自己的測試帳號（`qdbzdt2846` 與 `wfnxfy1592648`），無真實客人受影響**。補發與通用碼清理已執行
  - [x] **我的初修是錯的，已更正** → `4217a62`。見下方決策紀錄第一條
  - [x] 順帶發現兩項一併處理 → `1a88574`（規格全面對齊、貨到付款支援通用碼）
- 決策紀錄：
  - **退還依據：帳本，不是訂單欄位**（`4217a62` 更正 `ebfd509`）。初修改成退 `orders.points_used`，理由是「下單時 `deductPoints` 收到的就是它」。**這個推論在舊制訂單上是錯的**——小江跑稽核 SQL 拉出的線上資料顯示，2026-05-07 那批訂單 `points_used = 3300`、`points_discount = 33`，而 `point_transactions` 實際只扣了 33 點。照 `points_used` 退會憑空發出 3267 點，我還寫了一條測試把這個錯的語意釘死。新制 1:1 之後三者才一致，所以光看現在的訂單看不出差異
    - 改為 `refundOrderPoints()`：退還量 =「該訂單 `redeem` 絕對值總和」−「已有的 `refund` 總和」。**帳本是唯一不隨制度漂移的依據**，且「已扣 − 已退」順帶帶來冪等性（重複觸發不重複退、對被舊 bug 退過 1% 的訂單只補差額）
    - 教訓：這個錯是規格檔的舊制描述誤導的，見 lessons 與下方規格條目
  - **通用碼還原以 `order_id` 為鍵**：不必先判斷券的種類，兩種券都安全。若改成先查種類會需要新增欄位或多一次查詢，沒必要
  - 三條假測試（宣告本地變數再對自己做算術、從未呼叫路由）已刪除，於 `points-integration.test.ts` 留註記指向新測試檔
  - **規格 `openspec/specs/coupon-and-points/spec.md` 全面對齊新制**（`1a88574`）。原本只改取消段，小江要求一併處理其餘舊制殘留。逐條拿程式碼對照，不憑印象：
    - 「最少 200 點、須為 100 的倍數」→ 最低 `MIN_POINTS_USE`（10），**無倍數限制**。全 repo 搜不到 `% 100` 的檢查，那條規格是憑空寫的（比過時更糟：過時的至少曾經是真的）
    - 「每 100 點折抵 NT$1」→ 1:1
    - 「折抵上限 10%」→ 依會員等級 `max_discount_rate`，查 `supabase/points_system.sql` 確認 standard 0.10／silver 0.15／gold 0.20
    - 餘額定義補上「正向點數只計未過期者」；`/api/user/points` 的「最近 20 筆」→ 實際 `limit(50)`
    - 檔頭新增沿革警告：資料庫仍存有舊制訂單、兩欄不相等、帳本才是唯一可信依據，附 3300/33 實例。**這份規格剛剛才誤導我寫出會超額退還的程式碼，警告放檔頭是為了讓下一個人先看到**
  - **貨到付款改為支援通用碼**（`1a88574`）。`/api/orders` 原本直接查 `coupons` 表，四條金流路徑只有它不支援通用碼。改為與其他三條一致（`resolveCouponCode` → 批次券寫 `coupons`／通用碼寫 `coupon_usages`）。取消還原以 `coupon_usages.order_id` 為鍵，故自動對得起來，不需再改
    - **副作用需知情**：通用碼的總量 `max_uses` 現在會被貨到付款訂單一起消耗，之前的額度算是虛胖。有在跑的活動碼要回頭確認數字
- 反向驗證累計 6 次（皆如預期變紅後改回）：退點修正 2、會員取消 usages 刪除 2、後台 usages 刪除 1（`ebfd509` 那輪 3 次）；拿掉「減去已退」、路由改回 `points_used`（`4217a62` 2 次，後者 `expected 3300 to be 33`）；拿掉 `recordCouponUsage` 分支（`1a88574` 1 次）
- 狀態：已完成（證據：492 測試全過（37 檔）、`tsc --noEmit` 零錯誤、`npm run lint` 0 error、`npm run build` 成功；資料補償小江已跑完 7 段 SQL，複查回 0 列）

---

### [2026-08-01] 茶山體驗結帳與取消的點數稽核與修正
- 目標：小江要求檢查體驗預約的結帳正確性，以及取消時點數／折價券能不能退還
- 查證結論（先講折價券）：**體驗預約完全不支援折價券**——`/api/bookings`、`/api/ecpay/experience-checkout`、`BookingFlow.tsx` 全無 coupon 字樣，前端也沒有輸入欄位。所以「取消時退不回折價券」不成立（沒有可退的）。商品訂單的四條金流才支援
- 驗收條件：
  - [x] 兩條取消路徑改以帳本為準 → 新增 `refundBookingPoints()`（`src/lib/points.ts`），會員取消與後台取消都改用
  - [x] 結帳加上重複扣點防護 → `experience-checkout` 扣點前查該 booking 是否已有 `redeem`，有就沿用既有折抵
  - [x] 回歸測試 23 條 → `src/__tests__/bookings/cancel-booking.test.ts`（此前體驗預約**零路由測試**，只有 PII 測試）
  - [x] **反向驗證三次全過**：拿掉「減去已退」→ 2 紅；退點改回 `points_discount` → 3 紅（`expected 33 to be 3300`）；拿掉重複扣點防護 → 2 紅；改回全綠
  - [x] 反向驗證順帶抓到一條測試不夠強（`order_id` 欄位那條在舊寫法下也會過），已加強成 `points_discount` 與帳本刻意不同
  - [x] 稽核 SQL → `supabase/audit-experience-booking-points.sql`（4 段唯讀盤點 + 1 段補償）
  - [x] 兩份規格對齊實作 → `experience-booking-points`（整份重寫，加檔頭沿革警告）、`booking-cancellation`（退點段落改帳本制）
  - [ ] **小江待辦**：跑稽核 SQL 前 4 段，確認線上有無受影響的預約
- 三個真 bug：
  1. **取消退點以 `points_discount` 為準**（兩條路徑皆是）。體驗舊制（`2e1da44` 2026-04-11 ~ `abae014`）是 100:1，**帳本扣的是 `points_used`**：扣 3300 點、`points_discount` 只有 33，取消時只退 33，吞掉客人 3267 點
     - **與商品訂單的舊 bug 方向相反**：商品訂單舊制帳本只扣 33（`4217a62` 那輪），照 `points_used` 退會超額發放；體驗這邊照 `points_discount` 退則是少退。同一個「兩欄不一致」在兩條路徑上結論不同，不能照抄
     - 舊制的 redeem 記錄還誤寫在 `point_transactions.order_id`（`d104048` 之後才改 `booking_id`），`refundBookingPoints` 兩個欄位都查
     - 舊制的退還記錄 type 誤寫成 `earn`，計算「已退」時要納入（靠 description 含「取消退還」分辨），否則補償時會重複發
  2. **結帳可重複扣點**。`experience-checkout` 每次呼叫都無條件 `deductPoints`，但 `points_used`/`points_discount` 是覆蓋而非累加 → 客人從綠界按上一頁再送出一次就多扣一份，取消時只退得回一份
  3. 規格 `experience-booking-points` 整份仍是舊制（200 點、100 倍數、10%、發點 `/10`），且 `booking-cancellation` 寫著「取消待付款預約不執行任何點數操作」——與實作相反（待付款也可能已扣點，程式碼是全額退，實作才是對的）
- 決策紀錄：
  - **待付款取消全額退還，不套用退款比例**。點數在導向綠界**之前**就扣了，退款比例是針對「已成立的預約臨時取消」的違約金，未付款的預約不適用。兩條路徑原本就這樣寫，這次只是補進規格
  - **後台取消原本用 `refundAmount / paidAmount` 反推比例**，繞了一圈且 `paidAmount = 0` 時會靜默不退點。改成直接用同一個 `refundRate` 變數
  - **「減去已退」同時解決三件事**：冪等性、對被舊 bug 少退過的預約只補差額、舊制寫成 `earn` 的退還不重複發。與 `refundOrderPoints` 同一套算法，但體驗多了比例參數
- **未處理，需要小江決定**（結構性，不是 bug）：
  1. **點數在付款前就扣，且沒有清理逾期 `pending_payment` 預約的 cron**。客人放棄付款 → 預約永遠停在 `pending_payment`、點數無限期卡住，除非他自己進會員中心按取消。`vercel.json` 目前 6 個 cron 沒有一個管這個。盤點用稽核 SQL 第 4 段。要做的話是新增一支 cron（例：逾期 24 小時自動取消並退點），屬新功能故未擅自加
  2. **現金退款仍是純人工**：取消只寫 `refund_status = "pending"`，實際退錢要人去綠界後台操作，再回後台 PATCH 成 `processed`。沒有對帳機制
  3. `refundPoints` 插入的退還點數**沒有 `expires_at`**，等於變成永不過期的點數（商品訂單同樣如此）。金額不大但會慢慢累積成點數負債
- 狀態：程式碼已完成（證據：515 測試全過（38 檔）、`tsc --noEmit` 零錯誤、`npm run build` 成功、反向驗證 3 次如預期變紅後改回）；線上資料盤點待小江執行

#### 更正與結案（同日稍晚，小江跑完稽核 SQL 第 1–7 段之後）

**我先前對舊制的判斷是錯的，已全面更正。** 錯誤內容：我從 `git show 2e1da44` 讀到
`points: -pointsUsed`，就斷定「體驗舊制帳本扣的是 `points_used`（3300），照
`points_discount`（33）退會吞掉客人 3267 點」，並寫進規格檔頭、WORKLOG、lessons、
測試註解四個地方，還向小江報告了這個不存在的災難情境。

**線上實據（稽核 SQL 第 7 段）**：舊制預約的帳本記的是 −6，而 `points_used` 是 600。
原因在 `points_system.sql:132`——新制 migration 有一句
`UPDATE point_transactions SET points = ROUND(points/100)` 把**整個帳本**除以 100，
但同一份 migration 的 backfill（第 150 行）**只處理 `orders`，沒動 `experience_bookings`**。
所以 `points_used` 停在換算前的 600，`points_discount`(6) 反而與帳本**碰巧一致**。
→ 舊寫法在這批資料上不會退錯，我說的 99% 損失不成立。

**核實後的完整時間線**（每一段都有線上資料佐證）：
1. `2e1da44`（4/11 09:19 +0800）~ `d104048`（10:05 +0800）：扣點與退點寫進
   `point_transactions.order_id`，該欄 FK 指向 `orders`，**insert 靜默失敗**。
   `aef4f39e` 就是這種：只有預約、沒有任何 redeem 記錄，卻有一筆 earn 3
   「取消退還」——**沒扣過卻退了 3 點**（舊寫法依 `points_discount` 憑空發點）
2. `d104048` 之後：改寫 `booking_id`，扣點開始成功
3. 06:34–06:58 取消的 4 筆：扣了但退還沒寫進去 → 就是這次補發的 20 點
4. 07:06 之後：扣與退都正常（7 筆退還記錄，type 誤寫成 `earn`）

**稽核結果**：第 2 段 12 筆舊制預約、第 3 段 0 列（無重複扣點）、第 4 段 0 列
（無點數卡在未付款預約）。全部集中在 2026-04-11~04-15、全是 `qdbzdt2846`
測試帳號。**無真實客人受影響**。第 5 段補償已執行（`2026-08-01 08:03:47`，
4 筆 refund 共 20 點），第 6 段複查對得上。

**修正的價值在核實後重新評估**（與「100 倍差距」無關，那條不成立）：
- 舊制退還記錄 type 寫成 `earn`（線上 7 筆），算進「已退」才不會重複補發 ← 真正擋住的
- 帳本沒有 redeem 時不退點 ← `aef4f39e` 那種憑空發點的形狀
- 冪等性（小江重跑第 5 段不會重複發）
- 重複扣點防護（預防性，第 3 段 0 列）
- 不依賴「碰巧一致」——帳本已被 migration 單方面改寫過一次，`experience_bookings` 沒跟上

**稽核 SQL 自身的缺陷也修了**（`223c093`）：第 6 段原本只有一行標題註解、沒有 SQL，
執行它等於什麼都沒做卻會讓人以為複查過了；補上實際查詢，並新增第 7 段帳本診斷。

**已知但未處理的資料不一致**：`experience_bookings.points_used` 與帳本永久相差 100 倍
（migration 漏了這張表）。不建議回頭 backfill——歷史記錄改寫的風險大於好處，
且退還一律以帳本為準，該欄只是顯示用快照。規格檔頭已註明。

- 狀態：已完成（證據：24 條體驗預約測試全過、反向驗證共 4 次如預期變紅後改回、
  515+ 測試全過、`tsc` 零錯誤、`build` 成功；線上資料由小江跑完 7 段 SQL 核實，
  補償已執行、複查對得上）

---

### [2026-08-01] 體驗預約結案的三項結構性修補
- 目標：小江指示把前一節列出的三件未處理事項照建議做掉
- 驗收條件：
  - [x] 逾期未付款預約自動取消 cron → 新增 `src/app/api/cron/expire-pending-bookings/route.ts`，`vercel.json` 排 03:30 UTC
  - [x] 待退款對帳提醒 → `sendAdminPendingRefundDigest()` + `experience-reminders` 第 5 段
  - [x] `refundPoints` 補上 `expires_at` → 退還點數不再變成永久點數（商品訂單一併受惠）
  - [x] **順帶修掉第四個 bug**（見下）
  - [x] 回歸測試 10 條 → `src/__tests__/bookings/expire-pending-bookings.test.ts`
  - [x] **反向驗證兩次**：拿掉 `expires_at` → 1 紅；拿掉「場次已過期」判斷 → 1 紅；改回全綠
  - [x] 規格對齊 → `experience-booking-points` 改寫「點數在導向金流前就扣除」那條、`booking-cancellation` 新增兩條 Requirement 並釐清舊條目
- **第四個 bug：場次因人數不足自動取消時，點數完全沒退**
  - `experience-reminders` 第 2 段（活動前 3 天人數未達 `min_participants`）批次把預約改 `cancelled`、寫 `refund_status = "pending"`，但**沒有任何退點動作**
  - 這是體驗預約的**第四份**取消實作（會員取消／後台取消／場次取消／逾期取消）。它躲過了我先前的 grep——那支檔案裡根本沒出現 `points_discount`，**漏掉的東西 grep 不到**
  - 修法：逐筆 `refundBookingPoints({ refundRate: 1 })`。場次是店家取消的，客人無過失，不套用距活動時間的比例
- 決策紀錄：
  - **逾期判定是「或」不是「且」**：`created_at` 早於 24 小時前 **或** 場次時間已過。只用 24 小時會漏掉「場次 12 小時後開始」的預約——它撐不到逾期，場次就先過了
  - **併發保護用 `.eq("status", "pending_payment")` 而非先讀後寫**：cron 執行期間客人可能自己按了取消。update 不中就跳過；就算兩邊都跑到，`refundBookingPoints` 的「減去已退」會再擋一次
  - **不做自動現金退款**。那需要綠界退款 API 與實際出款權限，屬於金流出款，不在本次授權範圍。改為提供可見性：待退款超過 3 天寄摘要信給 `ADMIN_EMAIL`，列出已等待天數與合計。信裡註明「點數已自動退回，不需人工處理」，避免管理者重複操作
  - **退還點數的效期給 365 天**（與 `issuePoints` 一致），不繼承原始效期——`redeem` 是負值不帶 `expires_at`，追溯不到原本那批點數的剩餘期限。從退還當下重新起算對客人有利
  - **`refundPoints` 是共用函式**，這次補 `expires_at` 讓商品訂單的退點一併修好
- 狀態：已完成（證據：526 測試全過（39 檔）、`tsc --noEmit` 零錯誤、`npm run build` 成功且 `/api/cron/expire-pending-bookings` 已註冊、反向驗證 2 次如預期變紅後改回；`grep '"cancelled"'` 複查確認預約取消路徑共 4 處、皆已處理退點）

---

### [2026-08-01] 風土數位報價頁（接案品牌上線）
- 目標：把 taiwantea.store 當作接案 demo，新增 `/web-design` 報價頁與諮詢表單，
  Footer 放低調入口，讓覺得網站做得好的訪客能看報價、留資料、加 LINE 聊
- 商業決策（小江拍板，脈絡存在 memory `project_terroir_digital`）：
  - **品牌名「風土數位 Terroir Digital」**。否決「耕雲數位」的關鍵是實查撞名——
    台中已有耕雲科技（同為雲端／智慧農業），且「耕雲」搜尋被安祥禪學佔滿；
    「梯田數位」同樣撞名（新北梯田科技）。風土查無同名，搜尋獨佔性乾淨
  - **三階報價 39K／98K／250K 起**，98K 為主推（標「最多人選」）。旗艦標 250K
    低於接案公司行情（40–80 萬）是刻意的：沒有管銷的價差就是說服力
  - **定位：垂直敘事、通用報價**。文案主打農產與飲食品牌（對接小江中期的莊園案源），
    但明寫通吃各產業——垂直是聚光燈不是圍牆
- 驗收條件：
  - [x] openspec 提案四件（proposal／design／2 份 spec／tasks）＋文案定稿 `copy-zh.md`
  - [x] `web_inquiries` 表：六題欄位、`pain_points text[]`、**enable RLS 但不建任何 policy**
  - [x] `POST /api/web-inquiry`：rate-limit → honeypot → 白名單驗證 → service_role insert → best-effort 寄信
  - [x] `/web-design` 頁面（server metadata＋client 表單，照 contact 慣例拆檔）
  - [x] Footer 徽章、雙語字串（zh/en key 完全對稱，node 腳本比對無差異）
  - [x] 10 條回歸測試；全專案 536 測試全過（40 檔）
  - [x] checker 獨立驗收 11 項：10 PASS，唯一 FAIL 是 sitemap.ts 未在產物清單內——
        那是驗收派工後我才補的，屬清單過時非交付缺陷，已補列為 task 4.4
- 決策紀錄：
  - **不開匿名 RLS insert policy，一律走 API route + service_role**。全站查無匿名 insert
    先例（既有 policy 都綁 `auth.uid()`）；走 API 才能套 rate-limit、honeypot 與白名單，
    開匿名 policy 等於讓 spam 直寫 DB
  - **寄信 best-effort**：insert 成功後才寄，寄信失敗只 log 仍回 200。信丟了可接受，
    資料丟了不可接受
  - **LINE 連結用 `NEXT_PUBLIC_LINE_ADD_URL`，未設定即不渲染按鈕**（小江的 LINE 還沒提供），
    之後補環境變數即生效，不用改碼
  - **報價文案放 `messages/` 不進 Sanity**：需雙語、改動頻率低，進 CMS 是過度設計
  - **補了 sitemap 但刻意不動 `llms.txt`**：sitemap 收錄是純上檔；llms.txt 是告訴 AI
    「這站是什麼」的策展文件，塞進接案服務會稀釋茶品牌的主題聚焦，投報率不划算
- 上線後線上驗證（2026-08-01，小江已完成建表／Vercel 環境變數／LINE 歡迎訊息）：
  - `/web-design` HTTP 200，「風土數位」「250,000」與 LINE ID `580ariqa` 皆已嵌入
  - `web_inquiries` 表存在（anon 查詢回 `[]` 而非 404）
  - **RLS 實測有效**：anon key 直接 insert 被擋，`42501 new row violates row-level
    security policy`——spam 無法繞過 API route 的限流／蜜罐／白名單
  - 線上 API 非法值回 400 且不寫入
  - 小江實跑表單全流程（成功畫面、通知信、DB 記錄）回報「都沒問題」
- **一度誤判、已更正**：我先前報告「`.env.local` 的 `SUPABASE_SERVICE_ROLE_KEY` 失效、
  本機寫入全掛」是**錯的**。金鑰正常。401 的真正原因是 Supabase 新版 API key 會擋下
  「看起來來自瀏覽器」的 secret key 請求，而 PowerShell `Invoke-WebRequest` 的預設
  User-Agent 含 `Mozilla`。加 `-UserAgent "node"` 即 200。教訓見 lessons 同日條目
- LINE 帳號：`@580ariqa`（風土數位，與霧抉茶的 `NEXT_PUBLIC_LINE_OFFICIAL_URL` 分開兩個變數）

**v2（2026-08-02）：痛點／成果文案與案例故事頁**（commit `77125e5`）
- 目標：v1 只有方案與價格，缺「痛點共鳴」與「成果承諾」；並補案例故事頁作為高預算客戶的說服材料
- 交付：報價頁插入痛點區塊（5 場景＋損失註解＋轉折句）與成果區塊（4 機制利益＋ROI 試算框）；
  新增 `/web-design/case` 案例故事頁；FAQ 加 `id="faq"`、表單 id 改 `inquiry`（供 LINE 圖文選單直達）；
  LINE 圖文選單 1200×810 設計稿（Chrome headless 截圖，PNG 交付使用者，未進 repo）
- **文案紅線（已寫進 spec）**：不得出現編造的客戶成效數字。使用者要求「明確的賺錢利潤數字」，
  但無真實數據佐證的成效宣稱涉及公平交易法第 21 條，且被客人拆穿會毀掉品牌信任。改用四招替代：
  具體痛點場景／機制性利益（「24 小時的接單員」）／「如果」框架的 ROI 試算／可驗證事實。
  案例頁「現在」區塊的成長數字**留白**，待業主提供 GA 數據再填
- 驗收：checker 跑到一半被 Claude 月度額度上限中斷，改由主對話逐條補驗（詳見 tasks.md 6.6）。
  **教訓**：額度中斷不等於驗收通過；當下我一度只補了部分條件就對使用者說「全數通過」，
  是使用者追問「真的都完成了嗎」才回頭補完區塊順序與案例頁結構兩條
- 線上實測（部署後）：`/web-design`、`/web-design/case`、`/en/web-design/case` 皆 HTTP 200 且內容正確
- 附帶觀察（非本次造成、未處理）：next-intl 把**整份 `messages/*.json` 序列化進每一頁 HTML**，
  故 `/faq`、`/contact` 也含報價頁文案。全站既有行為，不影響正確性，但每頁 payload 偏大（70–110KB），
  日後若要優化可考慮 next-intl 的 messages 分割
- 待使用者處理：LINE 圖文選單補上案例頁與 `#faq` 兩格連結；提供 GA 數據以填案例頁成長數字
- 狀態：已完成（證據：536 測試全過（40 檔）、`tsc --noEmit` 零錯誤（sitemap 改動後複跑）、
  `npm run build` 成功且 `/web-design` 與 `/api/web-inquiry` 皆已註冊、checker 獨立驗收
  10/11 PASS 含文案逐字抽驗 5 處與 RLS 無 policy 複查）

---

### [2026-08-03] 設計系統地基：字體收斂 ＋ 品牌灌入語意 token
- 目標：小江要「一進站就有質感」。第零階段（Fable Max 產出的產品認識報告）已完成，
  本節記錄**查證修正**與**三個拍板**，並執行第一波地基工程（字體＋色彩語意層）
- **前情提要：Fable 的探索紀錄不在 main 上**。commit `2da8c59` 只存在於
  `origin/claude/design-system-discovery-884sfs`，本節即取代該紀錄（內容已整合並修正）

#### 對第零階段報告的查證結果
屬實、照單全收：色彩雙軌不相通（`globals.css:57-88` 全 `oklch(x 0 0)`，含 chart 色）／
深色模式是未啟用 scaffold（無 `darkMode` 鍵、無 ThemeProvider）／favicon 不存在／
Email 內聯 hex（`src/lib/email.ts:107-109`）／border-beam 前台零使用／
積分程式碼現值（`points.ts:72` `MIN_POINTS_USE = 10`，rate 0.02–0.04、上限 0.10–0.20）

**四處修正**：
1. **openspec 規格沒有過時，過時的只有 `tasks.md:26`**。
   `openspec/specs/coupon-and-points/spec.md` 已寫「最低使用 10 點」「倍數限制已取消」
   並引用 `points.ts` 為單一真相。此條必須更正——CLAUDE.md 鐵律 4 要求動高風險功能前
   先讀 openspec，若沿用「規格也過時」的結論會養成繞過規格的習慣，屬制度層損害
2. `Header.tsx:121` 的 `border-[#EDE8DC]` 引用錯誤（該行是 /account 連結；Header 為 271 行
   非 274）。該 class 實際集中在 admin，前台對應處是 `AccountClient.tsx:109` 的 `bg-[#EDE8DC]`
3. 「業務元件 0 處 `dark:`」→ 業務元件確實 0 處，但全站有 13 處，全在 `components/ui/`
   的 button/select（shadcn 原生自帶，而其 dark token 恰好是灰的）
4. **硬編碼 hex 的規模與分布是最大漏測**：全站 777 處 `[#xxxxxx]`，
   **admin 佔 746 處（96%）**，前台僅 31 處（另有 173 處品牌色盤外的 Tailwind 色）。
   → 重災區是後台不是前台，且「前後台同源」原則的成本 96% 落在後台

#### 拍板（小江已確認）
- **三條設計原則成立**，第 3 條補一句：**token 必須平台無關**——設計決策存在 CSS 變數層
  （`--radius-card`），元件只引用語意名。理由：`--radius-card: 16px` 可導成 React Native
  theme，`rounded-2xl` 一行帶不走。現在做是改名字，App 開案再做是重寫全站
- **預設淺色，且深色模式現在不做，只留欄位**。現況 0 個業務元件支援 `dark:`，實作等於
  全站再走一遍；真實需求只有「後台清晨看單」。深色欄位成本近 0 先填，實作綁後台重構那波
- **門面五件換掉 ChatWidget**：它是覆蓋層、不在轉換路徑、611 行改動成本最高、投報率最差。
  換成**付款轉跳與 `/order/result` 的等待／過渡狀態**——客人剛付完錢最焦慮的 3 秒，
  目前是沒設計過的白畫面
- **報告的最大缺口：全篇只談顏色與字體，沒有非顏色 token**。但質感八成來自間距節奏、
  字級比例、陰影克制、動態曲線。現況 `--radius` 定義了沒人用、陰影用 Tailwind 預設、
  動態寫死 `duration-500`。此軸另開任務（見待辦）

#### 本波發現的線上缺陷（對比度實測）
用 WCAG 公式實算 tea 色階，**主 CTA 不符 AA**：
| 組合 | 對比 | 判定 |
|---|---|---|
| 白字 on `tea-green #7D9B84`（首頁主 CTA `page.tsx:123`） | **3.05** | ❌ 內文不合格 |
| 白字 on `tea-green-dark #5C7A67` | 4.74 | ✅ |
| `text-tea-green` on cream（「查看全部」連結） | **2.85** | ❌ |
| `text-tea-text-light` on cream（次要內文，全站大量） | **3.43** | ❌ |

→ 解法：**新增兩色，不改動既有色階**（既有 `tea-*` 值全部保留，視覺零位移）：
- `tea-green-ink #58745F`：AA 安全的互動綠（連結／圖示／按鈕底），四種淺底皆 ≥4.54
- `tea-text-muted #637169`：低彩度次要文字色，四種淺底皆 ≥4.52。
  彩度 0.0214 vs green-ink 的 0.0476，明顯較灰，不會被誤讀為連結
- 語意 token 一律指向這兩色；既有 39 個檔案的 `tea-green`／`tea-text-light` 遷移另開一波

- 驗收條件：
  - [x] `next/font` 收斂：移除 `globals.css:1` 的 Google Fonts CDN `@import`，
        解決 `layout.tsx:14`（Geist）與 `globals.css:55`（Noto Sans TC）對 `--font-sans` 的雙重定義
  - [x] `tea-*` 灌進 shadcn 語意層（primary/secondary/muted/accent/border/ring/chart-*），
        深色欄位填但不啟用 `darkMode`
  - [x] `/verify` 三件套全過（測試＋型別＋build）
  - [x] 瀏覽器實跑驗證（見下方證據）

#### 實跑證據（dev server + DOM 查詢，非推論）
- `--font-latin` = `Geist, Geist Fallback`／`--font-sans` = `Noto Sans TC, Noto Sans TC Fallback`／
  `--font-serif` = `Noto Serif TC, Noto Serif TC Fallback`——三支各自獨立，雙重定義已解除
- **殘留 Google Fonts 連線：0**（`document.querySelectorAll('link')` 過濾 googleapis/gstatic 為空陣列）
- sans 鏈實測：`Geist → Geist Fallback → Noto Sans TC → Noto Sans TC Fallback → sans-serif`，
  拉丁走 Geist、中文回退 Noto——與改動前的視覺結果一致，但現在是明確宣告而非碰巧
- 已載入字重：Sans 400/500/600/700、Serif 400/600/700。**600 有了**（先前假造）、**300 已無**（先前白載）
- 產出 CSS 含 749 個 `unicode-range` 宣告、涵蓋 U+4E00–U+9FFF，中文字符確實自架成功
- next/font 額外產出 `Noto Sans TC Fallback` size-adjust 字型 → 順帶降低 CLS
- 建置成本：70 秒、218 個 woff2、11MB（瀏覽器只抓命中 unicode-range 的分片，不影響使用者）

#### 一個必須誠實說明的落差
`components/ui/button.tsx` 與 `select.tsx` **全站零引用**（grep import 無結果），
業務元件也 0 處使用語意 token，bare `border` 僅 1 處。
→ **語意層改動目前的可見變化幾乎只有 body 底色（白 → 米白 #FAF7F2），
其餘是純地基、沒有立即視覺回報**。價值在於後續元件遷移時有正確且合規的落點，
不該把這一步當成「視覺升級」向使用者邀功。真正的視覺回報在下一波遷移
- 待辦（本波不做，已排隊）：
  - [x] 非顏色 token 軸（radius/shadow/space/motion）→ 見下方「第二波」
  - [ ] favicon 與 app icon
  - [ ] `docs/design-system.md` ＋ 修 `tasks.md:26` 積分敘述（openspec 不動）
  - [ ] 既有 39 檔的 AA 遷移（`tea-green`→`tea-green-ink` 等）
  - [ ] 後台 746 處 hex 收斂（獨立一波，風險模式不同）
  - [ ] **WORKLOG 已 14 節超過 MAINT-4 的 10 節上限**，需開精簡任務壓縮舊節
- **邊界：本波只動前台與 token 層，後台 746 處 hex 不碰**。量體是前台 24 倍，
  且後台是茶農家庭每天在用的工作台，風險模式不同，混做會失控
- 狀態：本波已完成（證據：536 測試全過（40 檔）、`tsc --noEmit` 零錯誤、`npm run build` 成功、
  dev server 實跑 DOM 查詢確認字型鏈與 token 值如預期、Google Fonts 殘留連線為 0）。
  commit `6951084`，已推 `origin/claude/design-system-foundation`

**第二波（2026-08-03）：非顏色 token 軸**（commit `665ff90`）
- 命名由現況反推而非發明：先統計全站用法再替隱性慣例取名
  | 軸 | 現況分布 | token |
  |---|---|---|
  | 圓角 | lg 100／xl 149／2xl 120／3xl 9／full 187 | `--radius-inline/control/card/showcase/pill` |
  | 陰影 | sm 68／md 13／lg 10／xl 11 | `--shadow-resting/raised/float/modal` |
  | 動態 | duration 150/200/300/500；transition-colors 167 處 | `--motion-fast/base/slow/reveal` ＋ `--ease-standard/exit` |
  | 間距 | `py-16 md:py-24` 15 處／p-6 47／p-8 35 | `--space-section/-lg/card/card-lg/gutter` |
- **陰影改用茶墨色 `rgb(61 74 66)` 取代 Tailwind 預設純黑**。純黑壓在米白上會透出灰調，
  暖色陰影才不會讓米白顯髒——這是「看起來貴」與「看起來預設」的實際差別
- 首頁作為參考實作（圓角值與原本完全相同，1rem = rounded-2xl，唯一視覺變化是陰影色）

**順帶修掉的三個既有問題**
1. **`.no-scrollbar` 實際不存在**：原本用 `@utility` 宣告（Tailwind 4 語法），但本專案是
   Tailwind **3.4.19**，該語法不生成任何 CSS。`ChatWidget.tsx:565` 的橫向捲軸一直是露出來的。
   已改回 `@layer utilities`（postcss 未裝 nesting plugin，故 `::-webkit-scrollbar` 寫平選擇器）
2. **boxShadow 不可用 `card` 當 key**：`card` 已是 colors 的 key，同名會產出兩條 `.shadow-card`
   （陰影＋陰影顏色），後者在後會覆寫 `--tw-shadow`。目前碰巧仍成立但屬巧合，已改名 `resting`
3. **新增 `prefers-reduced-motion` 支援**：動態走 CSS 變數，改寫變數即可全站收斂

**同時發現、未處理（影響為零，故不動）**
- `globals.css` 裡的 `@theme inline`／`@custom-variant`／`@utility` 全是 Tailwind 4 語法，
  在 v3 下不生成任何東西，並原樣漏進產物 CSS（`@utility` 165 次、`@custom-variant` 27 次、
  `@theme` 6 次）。`tw-animate-css` 整包同理
- 影響為零的原因：這些 class 只被 `components/ui/select.tsx` 使用，而該檔**全站零引用**。
  專案自己用的 `animate-spin/bounce/pulse` 是 v3 內建、正常運作
- 要清理需連帶處理未使用的 shadcn 元件與 `tw-animate-css` 相依，屬獨立的死碼清除任務

**方法論教訓（已記 lessons）**：驗證 Tailwind 產物時我先用 `npx tailwindcss -c tailwind.config.ts`
跑了三次 probe 都「查無 utility」，一度以為 token 沒生效。實際是 **CLI 根本沒讀 TS config**——
用既有的 `bg-tea-green`（線上明明有效）當對照組才發現，先前三次全是無效測試。
Tailwind 產物一律以 `npm run build` 為準

- 驗證：536 測試全過（40 檔）、`tsc --noEmit` 零錯誤、`npm run build` 成功；
  dev server 實跑確認卡片圓角 16px、陰影為 `rgba(61,74,66,…)` 而非純黑、
  `transitionDuration` 0.2s、`ease` 為 `cubic-bezier(0.2,0,0,1)`、`no-scrollbar` 的
  `scrollbarWidth` 已回傳 `none`

**第三波（2026-08-04）：`docs/design-system.md` ＋ 修 `tasks.md`**（commit `f26ecf9`）
- 文件涵蓋：三條原則（含 token 平台無關的硬性條件）／色彩兩層對照／對比度基準與
  **已知不合格清單**／字體來源與可用字重／非顏色四軸／外包交付規格／施工邊界／待遷移清單
- **最實用的一節是「給生成工具的約束」**：附可直接貼的 prompt，明訂只出三色相階調、
  圓角限四階、陰影限茶墨色、對比 ≥4.5、**不要輸出程式碼**。
  這是把「用 Codex 做視覺」這件事變安全的關鍵——交付物換成圖與說明，不是 code
- `tasks.md` 修兩處：L26（200 點／100 倍數／10% → 10 點／無倍數／依等級 10-15-20%）
  與 L34（移除已不存在的「倍數」驗證項）。**openspec 規格未動**，它本來就是最新的
- 文件數字已逐條複查：hex 746/31、版面慣例 54/29、tea 十二色、utility key 全在 config、
  `select.tsx` 零引用、`border-beam` 前台無使用、所有引用路徑存在
- 本次僅動 markdown，無程式碼改動故未跑 `/verify`（證據為上述存在性複查）

**待使用者拍板**：是否把 `docs/design-system.md` 加進 `CLAUDE.md` 的路由表
（情境「要動視覺／介面」）。依 MAINT-1，改 `CLAUDE.md` 要先問使用者。
不加的話，未來 session 不會知道有這份文件——文件沒人讀等於沒寫。

**第四波（2026-08-04）：AA 遷移**（commit `e9971a6`）
- 三種線上不合格組合已修：`bg-tea-green+白字` 3.05（含首頁主 CTA）、`text-tea-green` 於米白 2.85、
  `text-tea-text-light` 內文 3.43
- 新增 `tea-green-deep #4D6954` 作 hover 態——舊的 `green-dark #5C7A67` 比 `green-ink #58745F`
  **還亮**，沿用會讓 hover 反向變亮
- **深色底方向相反**：淺底改深、深底改亮。`bg-tea-text` 內的標籤 → `green-light`；
  深色區再疊半透明卡片的（合成底 `#47534C`）→ `cream-light`，因為 `green-light` 在那裡只有 4.04
- 裝飾用 `bg-tea-green`（分隔線、圓點）**保留原色 40 處**——不承載文字就不是可存取性問題，
  改了只會讓品牌的淺綠消失

**驗證工具：`docs/contrast-audit.js`**（本波新建，後台那波會再用）
瀏覽器端稽核器，會**合成半透明圖層**後計算真實對比——比 grep 原始碼可靠得多。
成效：首頁 33→0、`/about` 6→0、`/products` 0、`/experiences` 0。
**已知限制**：絕對定位的覆蓋層抓不到（Hero 那種「照片＋遮罩＋文字」結構，遮罩是文字的
*兄弟*節點不是祖先，會穿透到 body 誤判）。首頁那 5 筆低對比即為此類假陽性，實際正常。

**方法論**：這次是「先全域替換、再用實測稽核抓回歸」，不是逐檔人工判斷。
關鍵在於稽核器對深色底的回歸一定抓得到（`#637169` 壓在 `#3D4A42` 上只有 1.9），
所以大膽改、再用證據收斂，比小心翼翼逐處判斷更快也更可靠。

**踩到的坑**（已記 lessons）：`perl -pi` 就地改檔的 unlink+rename 空窗被 Tailwind 撞上，
錯誤被寫進 `.next` 快取，導致 dev server 重啟後仍 500。`rm -rf .next` 即解。
一度誤以為檔案被刪，實際一個都沒少。

**使用者回報待處理**：小江說已把 Hero 遮罩調成偏好的顏色（原本太亮），但該改動
**不在本工作區**（`page.tsx:103` 仍是 `bg-tea-text/55`，`git diff` 為空，瀏覽器渲染值也相同）。
需向小江取得實際值後再落進 repo。

- 驗證：536 測試全過（40 檔）、`tsc --noEmit` 零錯誤、`npm run build` 成功
