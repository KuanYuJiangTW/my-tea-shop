## 0. 開工前置（擋住實作，需店主回覆）

- [ ] 0.1 **決策點 ①**：製程參數來源選 A／B／C（見 proposal「需要你拍板的三件事」）。選 A 需提供：蜜香紅茶的萎凋與發酵時數、紅烏龍的發酵程度與焙火條件、四季春與金萱是否有別於高山烏龍的參數
- [ ] 0.2 **決策點 ②**：確認四季春（南投名間）與紅烏龍（台東鹿野）是自家茶園／契作／外採，決定製程敘述的口吻
- [ ] 0.3 **決策點 ③**：路由架構選單頁（A）或子頁（B）
- [ ] 0.4 店主校對 `design.md` 1.4 節「工藝取捨」5 則內容的事實正確性（金萱輕焙、蜜香紅茶不用藥、紅烏龍炒菁分水嶺、高山烏龍看天萎凋、四季春多次採收）

> 0.1–0.3 未回覆前不進入第 2 節以後的實作。第 1 節（資料結構）不依賴這些決策，可先行。

## 1. 資料結構

- [ ] 1.1 新增 `src/data/tea-process.ts`：`TeaKey`／`FamilyKey`／`StepKey`／`StepState` 型別，5 款茶的家族歸屬與 10 步狀態矩陣（依 `design.md` 1.2）
- [ ] 1.2 每款茶加 `productId` 對應 `src/data/products.ts`，供 CTA 導流使用
- [ ] 1.3 驗證：`npx tsc --noEmit` 無新增錯誤；狀態矩陣與 design.md 1.2 表格逐格比對一致

## 2. i18n 文案

- [ ] 2.1 `messages/zh.json` 的 `process` 擴充：新增 `families.*`、`teaSteps.<teaKey>.<stepKey>.{desc,detail,skipReason}`、`matrix.*`、`teaSelector.*`、`craftNote.*`、`productCta.*`
- [ ] 2.2 新增 `steps.ferment` 與 `steps.ballRoll` 兩步的共通文案（現有 8 步 key 全部沿用，不作廢）
- [ ] 2.3 移除 `teas.green`、`teas.white` 與 `otherStyles*` 舊區塊字串（確認無其他頁引用後才刪）
- [ ] 2.4 `messages/en.json` 同步全部上述異動
- [ ] 2.5 驗證：寫一次性腳本遞迴比對兩檔 `process` 子樹葉節點 key 集合，差集必須為空（**機械比對，不得肉眼確認**）

## 3. 頁面實作

- [ ] 3.1 `ProcessContent.tsx` 新增茶款選擇器狀態，與現有 `activeStep` 併存；sticky 容器改為上排茶款、下排工序
- [ ] 3.2 工序列改為 10 步橫向捲動（`overflow-x-auto`），取代現行 `grid-cols-4 md:grid-cols-8`
- [ ] 3.3 保留現有 `stepBarRef` top 同步與 `IntersectionObserver` 高亮邏輯（`ProcessContent.tsx:56-117`），只換內容不重寫機制
- [ ] 3.4 工序卡片實作三態渲染；`skipped` 態保留卡片、降階樣式、顯示 `skipReason`
- [ ] 3.5 新增家族說明區塊（②）與工藝取捨區塊（④）
- [ ] 3.6 新增商品 CTA（⑤）導向 `/products`，經 `lp()` 處理 locale 前綴
- [ ] 3.7 新增 5 茶對照表（⑥），窄螢幕橫向捲動，取代原綠茶／白茶區塊
- [ ] 3.8 切換茶款不重設捲動位置；`prefers-reduced-motion` 停用轉場
- [ ] 3.9 沿用 `about/page.tsx:22-28` 的 5 茶漸層配色（已在 tailwind safelist，不需新增）

## 4. 結構化資料與 SEO

- [ ] 4.1 `src/app/process/page.tsx` 加入每款茶的 `HowTo` JSON-LD，`skipped` 工序不進 `step` 陣列
- [ ] 4.2 JSON-LD 一律經 `jsonLdString()` 序列化；metadata 沿用 `langAlternates("/process")`
- [ ] 4.3 更新 page metadata 的 `description`／`keywords`，納入 5 款茶與「紅茶製程」「紅烏龍」「四季春」等詞
- [ ] 4.4 驗證：`npm run build` 後檢查產出 HTML 含 5 份 HowTo，且紅茶那份不含「炒菁」、含「發酵」

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
