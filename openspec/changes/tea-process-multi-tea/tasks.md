## 0. 開工前置

- [x] 0.1 **決策 ①** → 方案 B：只寫工序與原理，不寫溫度時間（2026-07-25 店主拍板）
- [x] 0.2 **決策 ②** → 主動標示來源徽章，敘事定調「每一款茶，都選它的原產地」（同上）
- [x] 0.3 **決策 ③** → 階段一維持單頁 `/process`，不做子頁（同上）
- [x] 0.4 **取得關鍵製程更正**：蜜香紅茶為球形紅茶（第一天烏龍工序 → 第二天紅茶揉捻與發酵 → 布球團揉成球），design.md 1.2 矩陣已重寫
- [x] 0.5 **球形紅茶完整製程已取得**（2026-07-25 店主補述）：
  - [x] 分歧段確為「揉捻 → 發酵」順序
  - [x] 第一天確實包含浪菁
  - [x] **有焙火**——回家後以箱型焙茶機烘焙調整風味
  - [x] 共通後段完整揭露：初乾（甲種乾燥機）→ 擠壓（擠壓機）＋布球團揉 → 乾燥 → 焙火（箱型焙茶機）→ 揀枝包裝
  - [x] 據此新增 `dryFirst`／`dryFinal` 兩個 step key，design.md 1.2 矩陣已更新為 11–12 步
- [x] 0.6 **紅烏龍順序與焙火條件性已確認**（2026-07-25 店主補述）：
  - [x] 紅烏龍分歧段為「**揉捻 → 發酵 → 炒菁**」——與蜜香紅茶前兩步相同，末端多一道炒菁
  - [x] 烏龍三款走與紅茶相同的共通後段（同一套設備）
  - [x] 焙火**不是共通工序**：四季春不焙直接賣、高山烏龍部分焙部分以生茶賣、蜜香紅茶有焙
  - [x] 據此新增第四態 `optional`（選配），並確立核心敘事改為「炒菁的位置」
- [x] 0.7 **擠壓不獨立成工序**（店主提議，經評估採納）：擠壓是布球團揉階段內反覆使用的設備，非獨立工序；且各茶廠配置不同。步驟名用「布球團揉」，擠壓機寫入內文設備說明
- [x] 0.8 **焙火配置與判斷依據已取得**（2026-07-25 店主補述）：
  - [x] 焙火程度：高山烏龍選配（網站預設淺焙）、金萱淺焙、四季春不焙、蜜香紅茶淺焙、紅烏龍重焙
  - [x] 判斷依據：看該批茶當下風味狀態與客人偏好；焙可增甜厚與穩定度，焙過頭則失花香與鮮度；通常只有青茶類才可能不焙
  - [x] 揀枝位置更正：**在布球團揉後的乾燥時同步進行**（粗選機選長枝、鼓風機篩雜物與不良葉），焙火後直接包裝
  - [x] 據此拆解 `sort`：揀枝併入 `dryFinal`、包裝獨立為 `pack`（見 design.md 1.2.3）
- [x] 0.9 **兩處文案事實已釐清**（2026-07-25 店主確認）：
  - [x] 揀枝**就是粗選機與鼓風機，無手工揀除**——現有 `steps.sort`「師傅逐一手工揀除」為不實工藝宣稱，本次必須修正
  - [x] 金萱奶香：**淺焙使奶香轉為奶油香，不會消失**；唯重焙才會被焙火味蓋掉。規劃者原推論已更正
- [x] 0.10 **店主校對完成（2026-07-30），四處更正已套用並加測試釘住**：
  - [x] **蜜香紅茶：不得寫成不用藥**——實情是仍會用藥防治小綠葉蟬以外的病蟲害。原文「要蜜香就不能用藥」是對外農藥宣稱，風險最高的一則。zh/en 的 `craftNote.black` 與 `teaSteps.black.pick.desc` 共 4 處已改寫
  - [x] **金萱：轉成奶油味的是中焙，不是淺焙**（店主二次更正）。三階段應為 淺焙＝奶香保留／中焙＝轉奶油味／重焙＝被焙火味蓋過
  - [x] **高山烏龍：原文讀起來像品質不穩**。改為：高山變數多所以更看重製茶技術，技術到位品質才穩定；製茶廠不在茶園旁而在日照充足處，日光萎凋好做；逐年差異只在風味（差不多但確實不一樣），不在品質
  - [x] **四季春：主因是機採成本低**，加上品種早生一年可採多次，兩者相加才是結構性原因。原文漏了最主要的機採
  - [x] 紅烏龍「鹿野為發源地」經店主確認**無誤**，不動
  - [x] 已新增 6 條測試把上述事實釘死（含農藥宣稱的黑名單比對），並做變異測試確認 4 條會如期紅燈
- [x] 0.11 **四季春機採已加上（2026-07-30 店主裁決）**：`tea-process.ts` 的 `sijichun.overrides` 加 `pick: "accent"`，並補 `teaSteps.sijichun.pick` 專屬文案（zh/en）——機採、成本遠低於手採、一年可採多次，明說「不是手工一心二葉地挑」。
  - 文案**只寫店主明確給的三項事實**，刻意不補「機採會混入老葉」之類的推論（lessons.md 2026-07-30 的教訓）
  - 實跑確認：四季春顯示機採文案＋「此茶專屬」標記、不再出現手採說法；高山烏龍仍走共通採摘文案；共通前段步驟組成不變（01 採摘 → 02 日光萎凋 → 03 室內萎凋 → 04 浪菁，總步數仍 10）

## 0.5 另案回報（非本 change 範圍）

- [x] 0.5.1 **已結案（2026-07-30 店主確認）**：高山烏龍製程上分生茶與焙茶，但**網站販售一律淺焙**，生茶只在門市／熟客詢問時提供。
  - **`src/data/products.ts` 不需要改**——單一品項是正確的。（現有變體只有重量一個維度，且綁在 id 位移上供結帳算運費；加焙度會變成二維變體，動到 id 配置、庫存欄位與運費計算。既然不上架就不必付這個代價）
  - 需要修的是**文案**：原稿「網站販售**預設**淺焙／唯有特別出色的批次才不焙／看**客人要什麼**」三處都暗示線上可能拿到生茶或可以選，與實情不符。已改為明講「網站上販售的一律是淺焙」，對照表欄位改為「淺焙（網站販售）」
  - 已新增 4 條測試釘住此販售條件宣稱（性質同農藥那則），並做變異測試確認 3 條會如期紅燈
  - `roast` 狀態仍維持 `optional`——那是**製程事實**，與販售政策是兩件事
- [x] 0.5.2 `npm run lint` **已修復**（2026-07-30 經店主指示）：補 `eslint.config.mjs`、`eslint-config-next` 15.5.12 → 16.2.12 對齊 Next 16、lint script 由 `next lint` 改為 `eslint`。註：`eslint` 與 `eslint-config-next` 本來就在 devDependencies，實際缺的只有設定檔——原描述「需要裝」不準確
- [ ] 0.5.5 **全 repo 尚有 22 個既有 lint error（13 檔）＋ 42 warnings** → 店主已裁示**另立 change**（2026-07-30），本 change 不處理。清冊如下，可直接照這個分批：

  依規則分類：

  | 規則 | 數量 | 性質 |
  |---|---|---|
  | `react-hooks/set-state-in-effect` | 12 | effect 內同步 setState，造成連鎖 render。本次在 `ProcessContent.tsx` 修過同一類（改為 render 時推導），可沿用該手法 |
  | `react-hooks/immutability` | 3 | 直接改動不可變值 |
  | `react-hooks/use-memo` | 3 | `useCallback`/`useMemo` 首參數非 inline function |
  | `react-hooks/purity` | 2 | render 期間有副作用 |
  | `@typescript-eslint/no-explicit-any` | 2 | 顯式 `any` |

  依檔案（**建議分三批，金流區單獨一批並先讀規格**）：

  - **批次 A｜金流與帳務（高風險，鐵律 4：改前先讀 `openspec/specs/` 對應規格，改後必跑 `npm run test`）**
    - `src/app/checkout/CheckoutClient.tsx` — set-state-in-effect×1, immutability×2
    - `src/app/account/AccountClient.tsx` — immutability×1, purity×1
    - `src/app/account/page.tsx` — purity×1
    - `src/app/account/bookings/[id]/participants/page.tsx` — set-state-in-effect×1
  - **批次 B｜admin 後台**
    - `src/app/admin/(protected)/campaigns/page.tsx` — set-state-in-effect×1
    - `src/app/admin/(protected)/coupons/page.tsx` — set-state-in-effect×1
    - `src/app/admin/(protected)/experiences/sessions/SessionsClient.tsx` — set-state-in-effect×1
    - `src/app/admin/(protected)/members/[id]/points/page.tsx` — set-state-in-effect×1
  - **批次 C｜前台元件（風險最低，可先做暖身）**
    - `src/components/ChatWidget.tsx` — set-state-in-effect×4（單檔最多）
    - `src/components/ProductLightbox.tsx` — use-memo×3
    - `src/components/Header.tsx` — set-state-in-effect×1
    - `src/app/experiences/[slug]/ExperienceCalendar.tsx` — set-state-in-effect×1
    - `src/app/auth/login/LoginForm.tsx` — no-explicit-any×2

  重跑清冊的指令：`npx eslint -f json | python3 -c "..."`（或直接 `npm run lint`）。修的時候記得 JUDG-2 第 2 條的歸屬對比紀律
- [x] 0.5.3 現有 `messages/*.json` 的 `process.steps.sort` 宣稱「師傅逐一手工揀除」與實情（粗選機、鼓風機）不符。**已於 task 2.3 修正並加測試防回退**，本項結案
- [x] 0.5.4 `e2e/` 無法執行一事**已寫成 `e2e/README.md`**（2026-07-30 經店主指示）：說明為何跑不起來（缺依賴、`/login` 路由不存在實際為 `/auth/login`、`data-testid` 在 `src/` 出現 0 次、需 staging 與測試帳號），並附臨時驗證做法（scratchpad 獨立安裝 playwright + 預裝瀏覽器路徑）與兩個坑（不要用 networkidle 當等待條件、不要用 `pkill -f "next start"`）
- [ ] 0.5.6 **要真正接通 e2e 覆蓋 → 另立 change**（店主已裁示，2026-07-30）。五個步驟，有相依順序：
  1. 補依賴：`@playwright/test` 進 devDependencies
  2. 修路由：`/login` → `/auth/login`，其餘 `goto()` 目標逐一核對（`/admin/dashboard`、`/admin/orders` 尚未查證）
  3. 在元件加 `data-testid`：至少 `product-card`、`add-to-cart`，及各 spec 引用到的其他選擇器
  4. 備測試帳號與 staging 環境（測試帳號需有點數餘額），設定 `E2E_BASE_URL`／`E2E_TEST_EMAIL`／`E2E_TEST_PASSWORD`
  5. 加 `test:e2e` npm script 並接上 CI

  1→2→3 可先做；4 需店主提供環境；5 最後。**建議第一步先為 `/process` 寫 spec**——不需登入、不碰 DB，可用來證明整條 harness 通了，再回頭處理結帳與點數那幾條高風險流程

## 1. 資料結構

- [x] 1.1 新增 `src/data/tea-process.ts`：型別齊備；共通前後段為模組常數（`COMMON_OPENING`／`COMMON_CLOSING`），分歧段為 per-tea 資料
- [x] 1.2 每款茶加 `productId` 對應 `src/data/products.ts`，並提供 `getProductFor()` 供 CTA 導流
- [x] 1.3 每款茶加 `sourcing` 欄位（`own` / `partner`）供來源徽章使用
- [x] 1.4 更正 `src/data/products.ts` 四季春 `origin`：「南投名間」→「南投名間松柏嶺」
- [x] 1.5 新增 `resolveSteps()`：組出各茶完整序列並依「skipped 不佔號、optional 佔號」規則編號
- [x] 1.6 驗證：新增 `src/__tests__/tea-process.test.ts`，21 條測試把 design.md 1.2 矩陣釘成斷言（炒菁位置、分歧段順序、焙火四態、共通段一致性、編號規則、擠壓不成工序）
- [x] 1.7 驗證證據：`npx vitest run src/__tests__/tea-process.test.ts` 21/21 綠；`npm run test` 27 檔 337 測試全綠（原 26 檔 316 測試，無退化）；`npx tsc --noEmit` 本次異動檔零錯誤；`npm run build` 成功且 `/process` 在路由表中

> **驗證環境註記**：`npm run build` 在無 `.env` 的容器會於 "Collecting page data" 階段失敗（缺 Supabase／Stripe／Sanity 設定），與程式碼無關。本次以 placeholder 環境變數實跑至完成以取得綠燈證據。
>
> **`npm run lint` 已於 2026-07-30 修復**（見 0.5.2）。第 1 節當時以 `tsc` 替代驗證，補跑 lint 後本次 diff 的檔案零 error 零 warning——詳見 6.2。

## 2. i18n 文案

- [x] 2.1 `messages/zh.json` 的 `process` 擴充：`families.*`、`teaSteps.<teaKey>.<stepKey>.{desc,detail,skipReason}`、`matrix.*`、`teaSelector.*`、`craftNote.*`、`productCta.*`、`divergence.*`、`sourcing.*`、`stepState.*` 全數到位
- [x] 2.2 新增 `steps.ferment`／`dryFirst`／`ballRoll`／`dryFinal`／`pack` 五步共通文案，設備均具名（甲種乾燥機、擠壓機與布球揉捻、粗選機與鼓風機、箱型焙茶機）
- [x] 2.3 拆解既有 `steps.sort`：揀枝入 `dryFinal`、包裝獨立為 `pack`。**同步移除「師傅逐一手工揀除」不實宣稱**，改為具名機器（0.5.3 據此結案）
- [x] 2.4 `steps.roast` 補寫三件事：回家以箱型焙茶機焙製、焙火雙向代價、因應客人偏好客製化
- [x] 2.5 既有 8 步的 `detail` 補上「判斷依據」。**注意：初版誤把既有溫度時數整批刪除，違反規格「既有參數保留」，已於 6.6.1 還原**——現況為參數在前、判斷依據在後，兩者並存
- [x] 2.6 `messages/en.json` 同步全部上述異動
- [x] 2.7 驗證：機械比對已寫成**常駐測試**（非一次性腳本）——`src/__tests__/tea-process.test.ts` 新增 i18n 測試，遞迴展開兩語系 `process` 葉節點集合取差集，並檢查 skipped 必有 skipReason、accent/optional 必有專屬 desc。參數相關的斷言已於 6.6.1 改為雙向（既有須保留／新增不得有）
- [x] 2.8 驗證證據：`npm run test` 27 檔 345 測試全綠（原 337，+8 無退化）。**已做變異測試**：故意刪掉 `en.craftNote.redOolong` 並塞回溫度參數，3 條測試如預期紅燈，證明測試非空轉

- [x] 2.9 移除 `teas.green`、`teas.white` 與 `otherStyles*` 舊區塊字串。原本因 `ProcessContent.tsx` 仍在引用而順延，已於第 3 節改寫頁面時一併完成；`process.teas` 現為五款實售茶（含 `origin`／`flavor`／`roast`／`oxidation`，供對照表取用）

## 3. 頁面實作

- [x] 3.1 `ProcessContent.tsx` 新增 `activeTea` 狀態與 `activeStep` 併存；sticky 容器改為上排茶款、下排工序
- [x] 3.2 工序列改為橫向捲動（`overflow-x-auto`），取代原 `grid-cols-4 md:grid-cols-8`
- [x] 3.3 保留原 `stepBarRef` top 同步與 `IntersectionObserver` 機制，只換資料來源（改吃 `resolveSteps`）
- [x] 3.4 核心洞察圖區塊（IA ②）：共通前段 → 分歧段 → 共通後段，分歧段以底色與箭頭強調
- [x] 3.5 工序區三段結構；分歧段套 `bg-tea-green-mist` 容器與段落標題，共通段維持原底色
- [x] 3.6 四態渲染：`skipped` 保留卡片、標題劃線 + `opacity-50`、編號欄顯示破折號並改印 `skipReason`
- [x] 3.7 切換茶款時共通前後段的**步驟組成**不變（由 `COMMON_OPENING`／`COMMON_CLOSING` 常數渲染），結構性變動只在分歧段；共通段的個別工序可帶該茶專屬狀態——規格措辭於 6.6.4 經店主裁決修正
- [x] 3.8 家族說明（徽章列）與工藝取捨區塊（含焙火專段）
- [x] 3.9 來源徽章：中性樣式，與家族／發酵度徽章同級並列
- [x] 3.10 商品 CTA 導向 `/products`，經 `lp()` 處理 locale 前綴，附該茶漸層色塊與品名
- [x] 3.11 5 茶對照表：語意化 `<table>`（`thead`/`th scope`/`caption`），窄螢幕 `overflow-x-auto`
- [x] 3.12 切換茶款不重設捲動位置；`prefers-reduced-motion` 停用捲動動畫與 transition
- [x] 3.13 每款茶 `id` anchor（`#oolong`／`#redOolong` 等），支援進站與站內 hash 切換
- [x] 3.14 沿用 `about/page.tsx` 的 5 茶漸層配色
- [x] 3.15 移除舊的綠茶／白茶區塊與 `otherStyles*` 字串（2.9 據此結案）

### 實作過程抓到並修掉的兩個 bug

- [x] 3.16 對照表左上角格子誤印「製法家族」，與第一列列標題重複——改為留白 + `sr-only` 表名
- [x] 3.17 **hash 切換失效**：只在 mount 時讀 `location.hash`，站內已在 `/process` 時再點 `/process#redOolong`，瀏覽器只發 `hashchange` 不重新掛載元件，茶款不會跟著換。已補 `hashchange` 監聽

### 3.18 驗證證據（實跑，非推論）

- `npm run test`：27 檔 345 測試全綠
- `npx tsc --noEmit`：本次異動檔零錯誤（唯一錯誤在 `src/__tests__/points/admin-campaigns-audit.test.ts`，不在本次 diff 內）
- `npm run build`：成功，`/process` 在路由表
- 實跑 `next start` 取頁：zh `/process` 與 en `/en/process` 皆 HTTP 200，server log **零 `MISSING_MESSAGE`**
- Playwright 實測互動（截圖存 scratchpad）：

  | 檢查項 | 結果 |
  |---|---|
  | 預設茶款 | 高山烏龍 |
  | 烏龍：發酵 skipped、焙火 optional | ✓ |
  | 蜜香紅茶：炒菁 skipped、採摘 accent（著蜒） | ✓ |
  | 四季春：焙火 skipped | ✓ |
  | 紅烏龍：發酵／焙火 accent | ✓ |
  | 切換茶款捲動位置不變（1800 → 1800） | ✓ |
  | 點茶款更新 hash（`#black`） | ✓ |
  | 帶 `#redOolong` 進站選中紅烏龍 | ✓（修 3.17 後） |
  | 語意化表格（6 表頭 / 10 資料列，含 6.6.2 補上的「浪菁」列） | ✓ |
  | 瀏覽器 console error | 0 |

> 環境限制：容器無 Supabase 連線，`featuredExperiences` 取不到資料，故茶山體驗區塊在截圖中不顯示（該區塊為既有程式碼，本次未動）。

## 4. 結構化資料與 SEO

- [x] 4.1 `src/app/process/page.tsx` 加入每款茶的 `HowTo` JSON-LD；`skipped` 工序**不進** `step` 陣列（它在頁面上是對比用的說明，不是這款茶真的會做的一步）
- [x] 4.2 一律經 `jsonLdString()` 序列化；metadata 沿用 `langAlternates("/process")`
- [x] 4.3 更新 metadata `description`／`keywords`，納入 5 款茶與「紅茶製程」「球形紅茶」「紅烏龍」「四季春」「炒菁」「布球團揉」等詞
- [x] 4.4 修掉自己寫出來的 bug：HowTo 名稱原本把「的製作過程」寫死在字串模板，EN 站會印出 `High Mountain Oolong的製作過程`。已抽成 `process.howTo.name` 佔位字串（zh `{tea}的製作過程`／en `How {tea} Is Made`）
- [x] 4.5 驗證證據（實跑 `next start` 解析產出 HTML 的 JSON-LD）：

  | 檢查項 | 結果 |
  |---|---|
  | zh／en 各 5 份 HowTo | ✓ |
  | 步數符合 design.md 1.2 矩陣 | 11／11／10／11／12 ✓ |
  | 蜜香紅茶不含「炒菁」 | ✓ |
  | 蜜香紅茶含「發酵」與「布球團揉」 | ✓ |
  | 蜜香紅茶「揉捻」排在「發酵」之前 | ✓ |
  | 紅烏龍「炒菁」排在「發酵」之後 | ✓ |
  | 四季春不含「焙火」 | ✓ |
  | EN HowTo 名稱為英文 | ✓（修 4.4 後） |

## 5. 可及性與 RWD

- [x] 5.1 茶款與工序控制項皆為原生 `<button>`。茶款選擇器補完**完整 WAI-ARIA tabs pattern**——原本只有 `role="tab"` 卻沒有配對的 tabpanel 與方向鍵導覽，屬不完整的 ARIA（對螢幕閱讀器反而比不加更糟）。現已補上 `aria-controls`／`role="tabpanel"`／`aria-labelledby`、roving tabindex 與方向鍵操作
- [x] 5.2 375px 實測通過
- [x] 5.3 鍵盤走訪與 focus ring 實測通過
- [x] 5.4 驗證證據（Playwright 實測）：

  | 檢查項 | 結果 |
  |---|---|
  | 375px body 無水平捲動 | ✓ |
  | sticky 兩排高度 166px（視窗 812px 的 20.4%，門檻 30%） | ✓ |
  | 對照表在自己的 `overflow-x:auto` 容器內捲動 | ✓ |
  | roving tabindex（`0,-1,-1,-1,-1`） | ✓ |
  | ←／→ 換茶且焦點跟隨 | ✓ |
  | Home／End 跳頭尾（高山烏龍／紅烏龍） | ✓ |
  | tab 與 tabpanel 雙向關聯正確 | ✓ |
  | focus ring 可見 | ✓ |

### 6.0 逐條核對 `specs/tea-process-page/spec.md` 後補正的兩處

實作完成後把規格 Requirement 逐條回頭對，抓到兩處自己沒對齊的地方：

- [x] 6.0.1 **`HowTo.name` 未與 `products.ts` 一致**：規格明訂「SHALL 依 locale 對應中英名稱，與 `src/data/products.ts` 的 `name`／`nameEn` 一致」，但我原本用頁面短名（`teas.*.name` → 「高山烏龍」）。已改取商品正式品名（「阿里山高山烏龍茶」／`Ali Shan High Mountain Oolong`）；頁面短名仍用於導覽列與對照表，不進結構化資料
- [x] 6.0.2 **四季春產地少了「南投」**：規格與 `products.ts` 皆為「南投名間松柏嶺」，i18n 寫成「名間松柏嶺」。zh／en 均已補正

另外核對過、**確認不構成違規**的一項：

- 規格要求「合作茶款的製程敘述 SHALL NOT 使用第一人稱宣稱為自家工序」。共通文案 `steps.roast` 內含「我們」，但四態設計剛好隔開了它——該共通文案只有金萱與蜜香紅茶（皆自家茶園）會看到；四季春走 `skipReason`、紅烏龍與高山烏龍走各自的專屬文案。已用程式掃過兩款合作茶會看到的全部文案，零第一人稱宣稱

## 6. 驗收

- [x] 6.1 `npm run test` 全綠：27 檔 345 測試（基準 26 檔 316，本次 +1 檔 +29 測試，無退化）
- [x] 6.2 `npm run lint` **已可執行並已通過**（修復見 0.5.2）。本次 diff 的 5 個檔案（`ProcessContent.tsx`／`page.tsx`／`tea-process.ts`／`products.ts`／`tea-process.test.ts`）**零 error 零 warning**
  - 依 JUDG-2 第 2 條做了機械歸屬對比（非「應該是既有的」）：以 `git diff --name-only $(git merge-base HEAD origin/main) HEAD` 取本次改動檔清單，比對 `eslint -f json` 逐檔結果 → 我的 1E／既有 22E 42W
  - 修掉了 lint 抓到、而 `tsc` 與測試都抓不到的一個真問題：`react-hooks/set-state-in-effect`——原本用 effect 去修正切換茶款後失效的 `activeStep`，改為 render 時推導 `effectiveStep`，消除連鎖 render 與雙重事實來源
  - 重新驗證通過：345 測試全綠、build 成功、Playwright 互動全數維持，並補測 clamping 邊界（紅烏龍第 12 步 → 切四季春 10 步，高亮回落至有效的「01 採摘」且僅一個高亮）
- [x] 6.3 `npm run build` 成功（容器無 `.env`，以 placeholder 環境變數實跑至完成）
- [ ] 6.4 派 `checker` 獨立驗收 —— **未執行**：本 session 的執行環境指示為「未經使用者要求不得派 subagent」，與 CLAUDE.md 鐵律 2 衝突時以前者為準。已改為主對話內逐條實跑驗證並附證據（見各節驗證表）。**若要照規格派 checker 複驗，請明示**
- [x] 6.5 zh／en 雙語各自實跑頁面：皆 HTTP 200，server log 零 `MISSING_MESSAGE`，HTML 內零 `process.xxx` 原始 key 外露

### 6.6 checker 獨立驗收結果與處置（2026-07-30）

checker 回報 3 條 FAIL。逐條自行查證後：**2 條有效已修，1 條為規格自我矛盾、留待店主裁決。**

- [x] 6.6.1 **FAIL 有效（已修）｜既有製程參數被整批刪除**。規格「製程參數不得虛構」明文：方案 B 只限**新增**茶款與**新增**工序，「現有烏龍流程既有的參數（`steps.*.detail` 的溫度與時間）SHALL 保留——那些是已確認的自家做法」，並另立 Scenario「既有參數保留」。我把方案 B 誤讀為全面禁用，刪掉 6 步已確認參數（260-300°C、8-12小時等），**且寫了一條測試斷言「不得出現溫度時數」，把違規行為釘成正確行為**——這是本次最嚴重的錯誤：測試全綠反而掩護了規格違反。
  - 處置：6 步參數全部還原（參數在前、判斷依據在後，兩者並存嚴格優於任一方），紅烏龍與高山烏龍的專屬焙火文案同步帶回參數
  - 測試改為**雙向**釘死：`既有工序的溫度與時間參數必須保留` ＋ `新增工序不得出現溫度或時數`，並補一條擋含糊語句（「發酵至適當程度」類）
  - 已做雙向變異測試：刪既有參數 → 前者紅；往新增工序塞參數 → 後者紅。兩條都非空轉
- [x] 6.6.2 **FAIL 有效（已修）｜對照表缺「浪菁」欄**。規格明列 10 個欄位含浪菁，我只渲染 9 列；`matrix.rowShake` 兩語系都有字串卻沒被使用，是孤兒 key。已補上該列，紅烏龍為 `✓✓`（對應 design.md 1.3 的重攪拌），實跑確認表格為 10 列且順序與規格一致
- [x] 6.6.3 **checker 附帶指出（已修）｜`dryFinal` 的 detail 只列設備、沒有判斷依據**。規格要求判斷依據須為可觀察徵象，不得含糊。已補「茶葉手折即斷、不再回軟，枝葉分離乾淨」，並加測試要求除 `pick`／`pack` 外每步 detail 都須含判斷依據

- [x] 6.6.4 **規格自我矛盾已由店主裁決修正措辭（2026-07-30）**。

  checker 依原 Scenario「切換茶款時共通段不動」（原文：「共通前段與共通後段的**卡片內容**不變」）判 FAIL，理由是蜜香紅茶的 `pick` 標為 accent。查證後確認該措辭與**同一份規格的其他要求矛盾**：`roast` 屬共通後段，卻被規格自己要求於四季春 `skipped`、高山烏龍 `optional`、紅烏龍 `accent`；也與經店主校對的 `design.md` 1.2 矩陣矛盾。

  **店主裁決：改規格措辭為「步驟組成不變」。** 已修 `spec.md`：
  - Requirement 本文改為「共通前後段的**步驟組成**（步驟集合與順序）SHALL 保持不變，結構性的變動 SHALL 僅發生在分歧段」，並明文 MAY 帶該茶專屬的 `accent`／`optional`／`skipped`，SHALL NOT 因「共通段」之名被抹平
  - 原 Scenario 改寫為「切換茶款時共通段的**步驟組成**不動」（逐步列出前段四步、後段五步）
  - 新增 Scenario「共通段允許該茶專屬的強化說明」（以蜜香紅茶著蜒為例，強調步驟仍在原位、仍是第 01 步）
  - 附「措辭沿革」註記說明為何改，避免後人重複踩同一個矛盾
  - 新增 3 條測試釘住改後的規則：步驟組成跨五茶一致／共通段確實存在專屬狀態且不得被抹平／`skipped` 只出現在 `ferment`｜`fix`｜`roast` 三步。已做變異測試（移除四季春 `pick: accent` → 2 條如期紅燈）

## 7. 收尾

- [ ] 7.1 評估 `HowTo` 需求是否併入 `seo-structured-data` capability（待 `ai-search-seo` change 歸檔後）
- [ ] 7.2 更新 `.claude/WORKLOG.md` 本次任務節；踩到的坑當下寫入 `.claude/playbooks/lessons.md`
- [ ] 7.3 commit + push 至 `claude/tea-process-page-expansion-8qef3u`
- [ ] 7.4 部署後抽查 production `/process` 與 `/en/process`：View Source 確認 5 份 HowTo、對照表渲染正常
