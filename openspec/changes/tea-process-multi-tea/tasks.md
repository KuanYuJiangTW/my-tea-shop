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
- [ ] 0.10 店主校對 `design.md` 1.4 節「工藝取捨」其餘各則的事實正確性（蜜香紅茶不用藥、紅烏龍炒菁分水嶺、高山烏龍看天萎凋、四季春多次採收）

## 0.5 另案回報（非本 change 範圍）

- [ ] 0.5.1 高山烏龍既分生茶與焙茶兩種賣法，`src/data/products.ts` 未呈現此區別——可能是未被網站呈現的商品選項，待與店主確認是否另立 change
- [ ] 0.5.2 `npm run lint` 在本 repo 完全不可用（`next lint` 已被 Next 16 移除，且無 eslint 設定檔）。修復需裝 eslint 9 flat config ＋ `eslint-config-next` 並改 package.json script——屬產品決策，待店主指示是否另立 change
- [x] 0.5.3 現有 `messages/*.json` 的 `process.steps.sort` 宣稱「師傅逐一手工揀除」與實情（粗選機、鼓風機）不符。**已於 task 2.3 修正並加測試防回退**，本項結案
- [ ] 0.5.4 `e2e/` 有 6 個 spec ＋ `playwright.config.ts`，但 `package.json` 完全沒有 `playwright` / `@playwright/test` 依賴——e2e 目前無法執行。本次驗證改用 scratchpad 獨立安裝的 playwright（未動 repo 依賴）。是否補依賴屬產品決策，待店主指示

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
> **`npm run lint` 在本 repo 不可用**：script 仍為 `next lint`（Next 16 已移除該指令），且 repo 內無任何 eslint 設定檔。已記入 `.claude/playbooks/lessons.md`。修復屬產品決策，待店主指示——見 0.5.2。

## 2. i18n 文案

- [x] 2.1 `messages/zh.json` 的 `process` 擴充：`families.*`、`teaSteps.<teaKey>.<stepKey>.{desc,detail,skipReason}`、`matrix.*`、`teaSelector.*`、`craftNote.*`、`productCta.*`、`divergence.*`、`sourcing.*`、`stepState.*` 全數到位
- [x] 2.2 新增 `steps.ferment`／`dryFirst`／`ballRoll`／`dryFinal`／`pack` 五步共通文案，設備均具名（甲種乾燥機、擠壓機與布球揉捻、粗選機與鼓風機、箱型焙茶機）
- [x] 2.3 拆解既有 `steps.sort`：揀枝入 `dryFinal`、包裝獨立為 `pack`。**同步移除「師傅逐一手工揀除」不實宣稱**，改為具名機器（0.5.3 據此結案）
- [x] 2.4 `steps.roast` 補寫三件事：回家以箱型焙茶機焙製、焙火雙向代價、因應客人偏好客製化
- [x] 2.5 **既有 8 步的 `detail` 全面改寫**：原本全是溫度時數（260-300°C、8-12小時等），依決策 ① 方案 B 逐條換成「判斷依據」
- [x] 2.6 `messages/en.json` 同步全部上述異動
- [x] 2.7 驗證：機械比對已寫成**常駐測試**（非一次性腳本）——`src/__tests__/tea-process.test.ts` 新增 8 條 i18n 測試，遞迴展開兩語系 `process` 葉節點集合取差集，並檢查 skipped 必有 skipReason、accent/optional 必有專屬 desc、文案不得回退出現溫度時數
- [x] 2.8 驗證證據：`npm run test` 27 檔 345 測試全綠（原 337，+8 無退化）。**已做變異測試**：故意刪掉 `en.craftNote.redOolong` 並塞回溫度參數，3 條測試如預期紅燈，證明測試非空轉

- [x] 2.9 移除 `teas.green`、`teas.white` 與 `otherStyles*` 舊區塊字串。原本因 `ProcessContent.tsx` 仍在引用而順延，已於第 3 節改寫頁面時一併完成；`process.teas` 現為五款實售茶（含 `origin`／`flavor`／`roast`／`oxidation`，供對照表取用）

## 3. 頁面實作

- [x] 3.1 `ProcessContent.tsx` 新增 `activeTea` 狀態與 `activeStep` 併存；sticky 容器改為上排茶款、下排工序
- [x] 3.2 工序列改為橫向捲動（`overflow-x-auto`），取代原 `grid-cols-4 md:grid-cols-8`
- [x] 3.3 保留原 `stepBarRef` top 同步與 `IntersectionObserver` 機制，只換資料來源（改吃 `resolveSteps`）
- [x] 3.4 核心洞察圖區塊（IA ②）：共通前段 → 分歧段 → 共通後段，分歧段以底色與箭頭強調
- [x] 3.5 工序區三段結構；分歧段套 `bg-tea-green-mist` 容器與段落標題，共通段維持原底色
- [x] 3.6 四態渲染：`skipped` 保留卡片、標題劃線 + `opacity-50`、編號欄顯示破折號並改印 `skipReason`
- [x] 3.7 切換茶款僅分歧段變動（共通前後段由 `COMMON_OPENING`／`COMMON_CLOSING` 常數渲染）
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
  | 語意化表格（6 表頭 / 9 資料列） | ✓ |
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

## 6. 驗收

- [x] 6.1 `npm run test` 全綠：27 檔 345 測試（基準 26 檔 316，本次 +1 檔 +29 測試，無退化）
- [ ] 6.2 `npm run lint` —— **本 repo 無法執行**（見 0.5.2）。已改用 `npx tsc --noEmit` 替代：本次異動檔零錯誤（唯一錯誤在 `src/__tests__/points/admin-campaigns-audit.test.ts`，不在本次 diff 內，屬既有）
- [x] 6.3 `npm run build` 成功（容器無 `.env`，以 placeholder 環境變數實跑至完成）
- [ ] 6.4 派 `checker` 獨立驗收 —— **未執行**：本 session 的執行環境指示為「未經使用者要求不得派 subagent」，與 CLAUDE.md 鐵律 2 衝突時以前者為準。已改為主對話內逐條實跑驗證並附證據（見各節驗證表）。**若要照規格派 checker 複驗，請明示**
- [x] 6.5 zh／en 雙語各自實跑頁面：皆 HTTP 200，server log 零 `MISSING_MESSAGE`，HTML 內零 `process.xxx` 原始 key 外露

## 7. 收尾

- [ ] 7.1 評估 `HowTo` 需求是否併入 `seo-structured-data` capability（待 `ai-search-seo` change 歸檔後）
- [ ] 7.2 更新 `.claude/WORKLOG.md` 本次任務節；踩到的坑當下寫入 `.claude/playbooks/lessons.md`
- [ ] 7.3 commit + push 至 `claude/tea-process-page-expansion-8qef3u`
- [ ] 7.4 部署後抽查 production `/process` 與 `/en/process`：View Source 確認 5 份 HowTo、對照表渲染正常
