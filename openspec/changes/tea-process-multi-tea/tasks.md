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
- [ ] 0.6 **店主待確認（不擋實作，擋上線）**：
  - [ ] 紅烏龍分歧段順序是否為「重發酵 → 炒菁 → 揉捻」
  - [ ] 烏龍三款的共通後段是否與紅茶完全相同（依店主「回烏龍的擠壓機」一語推斷為相同，需確認初乾與乾燥是否也同一套設備）
  - [ ] 五款茶是否都是「回家後才焙火」，或僅部分茶款如此
- [ ] 0.7 店主校對 `design.md` 1.4 節「工藝取捨」6 則的事實正確性（金萱輕焙、蜜香紅茶兩種工法接起來且不用藥、紅烏龍炒菁分水嶺、高山烏龍看天萎凋、四季春多次採收、焙火在家做）

> 0.6 只影響紅烏龍的分歧段順序與後段文案措辭，不影響資料結構與版面，可先實作、上線前補正。

## 1. 資料結構

- [ ] 1.1 新增 `src/data/tea-process.ts`：`TeaKey`／`FamilyKey`／`StepKey`／`StepState`／`Sourcing` 型別；共通前後段為模組常數，分歧段為 per-tea 資料（依 `design.md` 1.2、4）
- [ ] 1.2 每款茶加 `productId` 對應 `src/data/products.ts`，供 CTA 導流使用
- [ ] 1.3 每款茶加 `sourcing` 欄位（`own` / `partner`）供來源徽章使用
- [ ] 1.4 更正 `src/data/products.ts` 四季春 `origin`：「南投名間」→「南投名間松柏嶺」
- [ ] 1.5 驗證：`npx tsc --noEmit` 無新增錯誤；分歧段順序與 design.md 1.2 表格逐格比對一致

## 2. i18n 文案

- [ ] 2.1 `messages/zh.json` 的 `process` 擴充：新增 `families.*`、`teaSteps.<teaKey>.<stepKey>.{desc,detail,skipReason}`、`matrix.*`、`teaSelector.*`、`craftNote.*`、`productCta.*`、`divergence.*`、`sourcing.{own,partner}`
- [ ] 2.2 新增 `steps.ferment`／`steps.dryFirst`／`steps.ballRoll`／`steps.dryFinal` 四步的共通文案（現有 8 步 key 全部沿用，不作廢）；文案須具名設備：甲種乾燥機、擠壓機與布球揉捻、箱型焙茶機
- [ ] 2.3 `steps.roast` 文案補寫「回家後由店主親手焙製調整風味」的初製／精製分工敘事
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
