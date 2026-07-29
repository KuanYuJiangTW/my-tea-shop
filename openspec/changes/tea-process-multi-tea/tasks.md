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
- [ ] 0.5.3 現有 `messages/*.json` 的 `process.steps.sort` 宣稱「師傅逐一手工揀除」與實情（粗選機、鼓風機）不符，此為線上頁面的不實工藝宣稱。本 change 的 task 2.3 會修正，但若短期內不上線，建議先單獨改這一句

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

- [ ] 2.1 `messages/zh.json` 的 `process` 擴充：新增 `families.*`、`teaSteps.<teaKey>.<stepKey>.{desc,detail,skipReason}`、`matrix.*`、`teaSelector.*`、`craftNote.*`、`productCta.*`、`divergence.*`、`sourcing.{own,partner}`
- [ ] 2.2 新增 `steps.ferment`／`steps.dryFirst`／`steps.ballRoll`／`steps.dryFinal`／`steps.pack` 五步的共通文案；文案須具名設備：甲種乾燥機、擠壓機與布球揉捻、粗選機與鼓風機、箱型焙茶機
- [ ] 2.3 拆解既有 `steps.sort`：揀枝內容移入 `steps.dryFinal`、包裝內容移入 `steps.pack`（待 0.9 確認手工／機器的實情後定稿）
- [ ] 2.4 `steps.roast` 文案補寫三件事：回家後由店主親手焙製、焙火的雙向代價（增甜厚穩定 vs 失花香鮮度）、因應客人偏好客製化——文案方向見 design.md 1.2.2
- [ ] 2.3 移除 `teas.green`、`teas.white` 與 `otherStyles*` 舊區塊字串（確認無其他頁引用後才刪）
- [ ] 2.4 `messages/en.json` 同步全部上述異動
- [ ] 2.5 驗證：寫一次性腳本遞迴比對兩檔 `process` 子樹葉節點 key 集合，差集必須為空（**機械比對，不得肉眼確認**）

## 3. 頁面實作

- [ ] 3.1 `ProcessContent.tsx` 新增茶款選擇器狀態，與現有 `activeStep` 併存；sticky 容器改為上排茶款、下排工序
- [ ] 3.2 工序列改為橫向捲動（`overflow-x-auto`），取代現行 `grid-cols-4 md:grid-cols-8`（工序數增至 9–10，grid 會變三排過高）
- [ ] 3.3 保留現有 `stepBarRef` top 同步與 `IntersectionObserver` 高亮邏輯（`ProcessContent.tsx:56-117`），只換內容不重寫機制
- [ ] 3.4 新增核心洞察圖區塊（IA ②）：共通前段 → 分歧段 → 共通後段
- [ ] 3.5 工序區改為三段結構；分歧段加底色容器（`bg-tea-green-mist`）與標題，共通段維持白底
- [ ] 3.6 工序卡片實作三態渲染；`skipped` 態保留卡片、劃線 + `opacity-50`、顯示 `skipReason`
- [ ] 3.7 切換茶款時僅分歧段變動，共通前後段不動
- [ ] 3.8 新增家族說明區塊（IA ③）與工藝取捨區塊（IA ⑤）
- [ ] 3.9 新增來源徽章（自家茶園／合作茶農），中性樣式、與規格標籤同級
- [ ] 3.10 新增商品 CTA（IA ⑥）導向 `/products`，經 `lp()` 處理 locale 前綴
- [ ] 3.11 新增 5 茶對照表（IA ⑦），**語意化 `<table>`**、窄螢幕橫向捲動，取代原綠茶／白茶區塊
- [ ] 3.12 切換茶款不重設捲動位置；`prefers-reduced-motion` 停用轉場
- [ ] 3.13 每款茶區段加 `id` anchor（`#oolong`／`#black` 等），供 AI 段落層級引用
- [ ] 3.14 沿用 `about/page.tsx:22-28` 的 5 茶漸層配色（已在 tailwind safelist，不需新增）

## 4. 結構化資料與 SEO

- [ ] 4.1 `src/app/process/page.tsx` 加入每款茶的 `HowTo` JSON-LD，`skipped` 工序不進 `step` 陣列
- [ ] 4.2 JSON-LD 一律經 `jsonLdString()` 序列化；metadata 沿用 `langAlternates("/process")`
- [ ] 4.3 更新 page metadata 的 `description`／`keywords`，納入 5 款茶與「紅茶製程」「紅烏龍」「四季春」等詞
- [ ] 4.4 驗證：`npm run build` 後檢查產出 HTML 含 5 份 HowTo；紅茶那份不含「炒菁」、含「發酵」與「布球團揉」，且「揉捻」排序在「發酵」之前

## 5. 可及性與 RWD

- [ ] 5.1 茶款與工序控制項使用原生 `<button>`，補 `aria-label`／`aria-pressed`
- [ ] 5.2 375px 寬度實測：sticky 兩排不超過視窗高度 30%，對照表可橫向捲動且 body 無水平捲動
- [ ] 5.3 鍵盤 Tab 走訪 15 個控制項皆可聚焦、focus ring 可見

## 6. 驗收

- [ ] 6.1 `npm run test` 全綠（既有 26 檔／316 測試不得退化，貼輸出末段為證）
- [ ] 6.2 `npm run lint` 無新增錯誤（`git stash` 前後對比，不得用「應該是既有的」帶過）
- [ ] 6.3 `npm run build` 成功
- [ ] 6.4 派 `checker` 獨立驗收：對照 `specs/tea-process-page/spec.md` 每條 Requirement 的 Scenario 逐條查證，附 `file:line` 證據
- [ ] 6.5 zh／en 雙語各自實跑一次頁面（或 build 產出 HTML 抽查），確認無缺字串、無 `process.xxx` 原始 key 外露

## 7. 收尾

- [ ] 7.1 評估 `HowTo` 需求是否併入 `seo-structured-data` capability（待 `ai-search-seo` change 歸檔後）
- [ ] 7.2 更新 `.claude/WORKLOG.md` 本次任務節；踩到的坑當下寫入 `.claude/playbooks/lessons.md`
- [ ] 7.3 commit + push 至 `claude/tea-process-page-expansion-8qef3u`
- [ ] 7.4 部署後抽查 production `/process` 與 `/en/process`：View Source 確認 5 份 HowTo、對照表渲染正常
