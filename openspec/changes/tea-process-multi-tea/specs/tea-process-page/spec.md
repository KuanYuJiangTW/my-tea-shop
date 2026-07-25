## ADDED Requirements

### Requirement: 製茶過程頁涵蓋全部實售茶款

`/process`（含 `/en` 變體）SHALL 涵蓋 `src/data/products.ts` 中全部 5 款上架茶：高山烏龍（`oolong`）、金萱（`jinxuan`）、四季春（`sijichun`）、蜜香紅茶（`black`）、紅烏龍（`redOolong`）。茶款 i18n key SHALL 沿用 `about` 頁既有命名（`src/app/about/page.tsx:21`），不另創一套。

頁面 SHALL NOT 呈現店內未販售的茶類（現況頁尾的綠茶、白茶標籤需移除）。

#### Scenario: 商品目錄與製程頁一致

- **WHEN** 使用者比對 `/products` 與 `/process`
- **THEN** 兩頁出現的茶款集合完全相同，無「製程頁講了但買不到」或「買得到但沒講製程」的品項

#### Scenario: 未販售茶類不出現

- **WHEN** 使用者瀏覽 `/process` 任一區塊
- **THEN** 頁面不含「綠茶」「白茶」等未販售茶類的獨立介紹或氧化度標籤

### Requirement: 三個製法家族的分類

頁面 SHALL 將 5 款茶歸入 3 個製法家族，分類依據為工序結構差異：`partialBall`（部分發酵球型：oolong／jinxuan／sijichun）、`fullStrip`（全發酵條型：black）、`heavyBall`（重發酵球型：redOolong）。選中任一茶款時，SHALL 顯示其所屬家族名稱與一句話定位。

#### Scenario: 切換茶款顯示對應家族

- **WHEN** 使用者選擇「蜜香紅茶」
- **THEN** 家族標示為「全發酵條型紅茶」，而非烏龍類家族

### Requirement: 工序主軸與三態渲染

頁面 SHALL 以固定的 10 步工序主軸呈現製程：`pick`、`witherSun`、`witherIndoor`、`shake`、`ferment`、`fix`、`roll`、`ballRoll`、`roast`、`sort`。每款茶在每一步 SHALL 標記為三態之一：

- `common`：使用共通工序文案
- `accent`：使用該茶專屬文案，並有視覺強調
- `skipped`：卡片**保留但降階顯示**（劃線／低透明度），且 SHALL 顯示跳過原因

工序編號 SHALL 固定使用主軸編號（01–10），SHALL NOT 因茶款不同而重新編號。

#### Scenario: 紅茶跳過炒菁

- **WHEN** 使用者選擇「蜜香紅茶」並檢視第 06 步「炒菁」
- **THEN** 該卡片以降階樣式呈現、未被隱藏，且顯示跳過原因（紅茶不炒菁，讓氧化持續到底）

#### Scenario: 紅烏龍保留炒菁

- **WHEN** 使用者選擇「紅烏龍」並檢視第 06 步「炒菁」
- **THEN** 該卡片為正常（非降階）狀態——重發酵之後仍炒菁是紅烏龍與紅茶的分界

#### Scenario: 編號不跳號重排

- **WHEN** 使用者選擇「蜜香紅茶」
- **THEN** 可見工序的編號仍為主軸編號（例如 `roll` 恆為 07），不會因為前面有跳過的步驟而重編為 04

#### Scenario: 每款茶的三態組合正確

- **WHEN** 檢視 5 款茶各自的工序狀態
- **THEN** 狀態組合與 `design.md` 1.2 節的對照矩陣完全一致（`ferment` 僅 black／redOolong 有；`witherSun`、`shake`、`ballRoll`、`roast` 於 black 為 skipped）

### Requirement: 五茶製程對照表

頁面 SHALL 提供一張涵蓋全部 5 款茶的製程對照表，欄位至少包含：製法家族、發酵度、浪菁、炒菁、外型、焙火、產地／海拔、風味。產地與海拔 SHALL 取自 `src/data/products.ts`，不另立事實來源。

發酵度 SHALL 以分級（輕／全／重）表示；在製程參數未經店主確認前 SHALL NOT 標示發酵百分比數值。

#### Scenario: 對照表資料與商品資料一致

- **WHEN** 對照表顯示四季春的產地與海拔
- **THEN** 其值與 `src/data/products.ts` 中該品項的 `origin`／`altitude` 相同（南投名間、300m）

#### Scenario: 表格在窄螢幕可用

- **WHEN** 使用者以 375px 寬度瀏覽對照表
- **THEN** 表格可橫向捲動，頁面本身不產生水平捲動

### Requirement: 導流至商品與體驗

頁面 SHALL 為當前選中的茶款提供通往 `/products` 的 CTA，並保留既有的茶山體驗 CTA（`experienceCta`）。所有內部連結 SHALL 依 locale 加上 `/en` 前綴（沿用現有 `lp()` 慣例）。

#### Scenario: 英文版連結帶 locale 前綴

- **WHEN** 使用者在 `/en/process` 點擊購買 CTA
- **THEN** 導向 `/en/products`，不是 `/products`

### Requirement: 雙語內容對稱

`messages/zh.json` 與 `messages/en.json` 的 `process` 子樹 SHALL 保持 key 集合完全相同。所有使用者可見字串 SHALL 存放於 `messages/`，SHALL NOT 硬編碼於元件。

#### Scenario: 機械比對兩語系 key

- **WHEN** 以程式遞迴比對兩檔 `process` 子樹的葉節點 key 集合
- **THEN** 兩集合差集為空（現況已對稱，不得因本次擴充而退化）

### Requirement: 輸出 HowTo 結構化資料

`/process` SHALL 為每款茶輸出一份 `HowTo` JSON-LD。`step` SHALL 僅包含該茶實際執行的工序，`skipped` 狀態的工序 SHALL NOT 出現在結構化資料中。`HowTo.name` SHALL 依 locale 對應中英名稱，與 `src/data/products.ts` 的 `name`／`nameEn` 一致。

所有 JSON-LD SHALL 經 `src/lib/seo.ts` 的 `jsonLdString()` 序列化；頁面 metadata SHALL 沿用 `langAlternates("/process")`。

#### Scenario: 紅茶的 HowTo 不含炒菁

- **WHEN** 爬蟲解析 `/process` 中蜜香紅茶的 HowTo 節點
- **THEN** 其 `step` 陣列不含「炒菁」，且含「發酵」

#### Scenario: 安全序列化

- **WHEN** 任一 JSON-LD 欄位值含 `</script>`
- **THEN** 輸出 HTML 中該值不含字面 `<` 字元，data block 不被提前關閉

### Requirement: 互動與可及性

茶款切換 SHALL NOT 重設使用者的捲動位置。工序卡片狀態轉場 SHALL 使用動效呈現，並於 `prefers-reduced-motion: reduce` 時停用。茶款選擇器與步驟導覽 SHALL 合併為單一 sticky 容器，步驟列於窄螢幕採橫向捲動。

所有可點擊的茶款與步驟控制項 SHALL 為原生可聚焦元素並具備可辨識的 accessible name。

#### Scenario: 切換茶款不跳頁

- **WHEN** 使用者捲動至第 06 步後切換茶款
- **THEN** 視窗捲動位置維持不變，使用者可原地比較同一工序在不同茶款的差異

#### Scenario: 減少動態偏好

- **WHEN** 使用者系統設定為 `prefers-reduced-motion: reduce`
- **THEN** 狀態切換不套用轉場動畫，內容仍正確更新

#### Scenario: 鍵盤操作

- **WHEN** 使用者以 Tab 鍵走訪 sticky 導覽
- **THEN** 5 個茶款與 10 個工序控制項皆可聚焦，且每個控制項有明確的 accessible name

### Requirement: 製程參數不得虛構

頁面呈現的溫度、時間、次數等具體製程參數 SHALL 僅來自店主確認的實際做法，或明確標注為業界通則。SHALL NOT 由實作端自行推估後以「本場做法」語氣呈現。

未取得確認前，新增茶款的參數欄位 SHALL 留白或省略，而非填入推測值。

#### Scenario: 參數未確認時的呈現

- **WHEN** 蜜香紅茶的發酵時間尚未經店主確認
- **THEN** 該款茶的發酵工序只呈現工序說明與原理，不出現任何未經確認的時數或溫度數字
