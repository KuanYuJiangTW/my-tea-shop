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

頁面 SHALL 將 5 款茶歸入 3 個製法家族，分類依據為**炒菁在分歧段的位置**：`partialBall`（部分發酵球形：oolong／jinxuan／sijichun，炒菁→揉捻，炒菁在最前）、`fullBall`（全發酵球形：black，揉捻→發酵，無炒菁）、`heavyBall`（重發酵球形：redOolong，揉捻→發酵→炒菁，炒菁在最後）。選中任一茶款時，SHALL 顯示其所屬家族名稱與一句話定位。

三個家族 SHALL 皆標示為球形——五款茶全部以布球團揉成球，包含紅茶。

#### Scenario: 切換茶款顯示對應家族

- **WHEN** 使用者選擇「蜜香紅茶」
- **THEN** 家族標示為「全發酵**球形**紅茶」，而非條型紅茶、亦非烏龍類家族

### Requirement: 以炒菁位置作為核心敘事

頁面 SHALL 明確呈現「炒菁擺在哪裡決定茶種」這一組織原則：炒菁在最前為烏龍（氧化未起即暫停）、無炒菁為紅茶（氧化走到底）、炒菁在最後為紅烏龍（氧化跑一段再踩煞車）。

頁面 SHALL 明確呈現蜜香紅茶與紅烏龍的分歧段**前兩步相同**（揉捻→發酵），紅烏龍僅在末端多一道炒菁。SHALL NOT 將兩者呈現為互不相關的兩條路徑。

對照表 SHALL 以「炒菁的位置」（最前／無／最後）作為欄位，而非僅以「有／無」的布林值呈現。

#### Scenario: 核心敘事可見

- **WHEN** 使用者首次進入 `/process` 並閱讀核心洞察區塊
- **THEN** 可讀到炒菁位置與三種茶類的對應關係，無須先選擇任一茶款

#### Scenario: 紅烏龍與紅茶的親緣關係

- **WHEN** 使用者檢視紅烏龍的分歧段
- **THEN** 頁面說明其前兩步與蜜香紅茶相同，差異僅在末端的炒菁

### Requirement: 共通段與分歧段的結構呈現

頁面 SHALL 將製程呈現為三段結構：共通前段（`pick`、`witherSun`、`witherIndoor`、`shake`）、分歧段、共通後段（`dryFirst`、`ballRoll`、`dryFinal`、`roast`、`pack`）。分歧段 SHALL 有明顯異於共通段的視覺容器與標題。

揀枝 SHALL 併入 `dryFinal`（乾燥時同步進行），SHALL NOT 置於焙火之後——實際流程為焙火完成後直接包裝。包裝 SHALL 為獨立的 `pack` 步驟。

#### Scenario: 揀枝不在焙火之後

- **WHEN** 使用者檢視共通後段的步驟順序
- **THEN** 揀枝出現在「乾燥」步驟中（布球團揉之後），焙火之後的步驟為包裝而非揀枝

切換茶款時，SHALL 僅分歧段內容變動，共通前後段 SHALL 保持不變。

三段結構 SHALL NOT 被攤平為無分段的連續步驟清單——共 11–12 步，分段是其可讀性的前提。

#### Scenario: 五款茶共用前段

- **WHEN** 使用者依序切換 5 款茶並檢視共通前段
- **THEN** 採摘、日光萎凋、室內萎凋、浪菁四步在每款茶皆存在且不被標為跳過（蜜香紅茶的第一天工序與烏龍相同）

#### Scenario: 五款茶共用擠壓團揉

- **WHEN** 使用者檢視任一款茶的共通後段
- **THEN** 「擠壓團揉」皆存在且非跳過狀態——包含蜜香紅茶，因其為球形紅茶

#### Scenario: 紅茶亦有焙火

- **WHEN** 使用者檢視蜜香紅茶的共通後段
- **THEN** 「焙火」存在且非跳過狀態，說明其作用為調整風味

### Requirement: 具名設備與初製精製分工

工序文案 SHALL 具名呈現實際使用的設備：甲種乾燥機（初乾）、擠壓機與布球揉捻（布球團揉）、粗選機與鼓風機（乾燥・揀枝）、箱型焙茶機（焙火）。SHALL NOT 以「專業設備」「先進機具」等空泛詞彙取代。

設備 SHALL NOT 被抬升為工序層級——工序是「做什麼」，設備是「用什麼做」。具體而言，擠壓（束包機）SHALL 寫於布球團揉的內文，SHALL NOT 成為獨立步驟或出現於步驟導覽列。

#### Scenario: 擠壓不獨立成步驟

- **WHEN** 使用者檢視步驟導覽列
- **THEN** 不存在名為「擠壓」的獨立步驟；擠壓機出現在「布球團揉」的內文設備說明中

頁面 SHALL 呈現焙火在自家進行、由店主親手調整風味的事實，作為「職人親手把關」宣稱的具體依據。

設備名稱不屬於決策 ① 方案 B 所限制的製程參數（該限制僅針對溫度、時數、百分比），SHALL 完整寫出。

#### Scenario: 設備具名

- **WHEN** 使用者檢視「初乾」「布球團揉」「焙火」三個工序
- **THEN** 三者分別出現「甲種乾燥機」「擠壓機」「箱型焙茶機」字樣

#### Scenario: 焙火地點的敘事

- **WHEN** 使用者檢視「焙火」工序
- **THEN** 文案說明此步驟在自家完成、由店主親手調整風味，而非僅描述焙火的一般原理

#### Scenario: 切換茶款時共通段不動

- **WHEN** 使用者從高山烏龍切換至蜜香紅茶
- **THEN** 共通前段與共通後段的卡片內容不變，僅分歧段改變

### Requirement: 工序三態渲染

每款茶在每個工序 SHALL 標記為四態之一：

- `common`：使用共通工序文案
- `accent`：使用該茶專屬文案，並有視覺強調
- `skipped`：卡片**保留但降階顯示**（劃線／低透明度），且 SHALL 顯示跳過原因
- `optional`：卡片正常顯示，加註此步視批次決定，且 SHALL 說明判斷依據

工序編號 SHALL 採該茶自身的實際順序（01..N），SHALL NOT 使用跨茶款的固定槽位——分歧段的工序順序因茶而異（烏龍炒菁在最前、紅烏龍炒菁在最後），固定槽位會扭曲事實。

### Requirement: 焙火為條件性工序

焙火 SHALL NOT 被呈現為所有茶款共通的必經步驟。各茶款狀態 SHALL 為：高山烏龍 `optional`（焙與不焙皆有，網站販售預設淺焙）、金萱 `common`（淺焙）、四季春 `skipped`（不焙，以生茶販售）、蜜香紅茶 `common`（淺焙）、紅烏龍 `accent`（重焙）。

焙火的說明文字 SHALL 呈現其**雙向代價**：焙可使茶更甜、更厚實、品質更穩定，但焙過頭會使花香與鮮度流失。SHALL NOT 僅呈現焙火的正面效果。

焙火的說明文字 SHALL 呈現「因應客人偏好與該批茶當下風味狀態決定」的客製化性質，SHALL NOT 使用「有時候會焙」等模糊表述。

#### Scenario: 四季春不焙火

- **WHEN** 使用者選擇「四季春」並檢視共通後段
- **THEN** 「焙火」以降階樣式呈現並說明此款不焙、以生茶販售

#### Scenario: 高山烏龍焙火為選配

- **WHEN** 使用者選擇「阿里山高山烏龍茶」並檢視「焙火」
- **THEN** 該步標示為視批次與客人偏好決定，並說明網站販售預設為淺焙、唯生茶特別出色的批次才不焙

#### Scenario: 焙火的代價被明說

- **WHEN** 使用者檢視任一款茶的焙火說明
- **THEN** 文案同時包含焙火的收益（更甜、更厚實、品質更穩定）與代價（焙過頭則花香與鮮度流失）

#### Scenario: 焙火程度依茶款區分

- **WHEN** 使用者比對五款茶的焙火程度
- **THEN** 紅烏龍標示為重焙、四季春為不焙，其餘三款為淺焙，彼此可區分

#### Scenario: 紅茶跳過炒菁

- **WHEN** 使用者選擇「蜜香紅茶」並檢視分歧段
- **THEN** 「炒菁」卡片以降階樣式呈現、未被隱藏，且顯示跳過原因（紅茶不炒菁，讓氧化一路走到底）

#### Scenario: 紅烏龍保留炒菁

- **WHEN** 使用者選擇「紅烏龍」並檢視分歧段
- **THEN** 「炒菁」為正常（非降階）狀態——重發酵之後仍炒菁是紅烏龍與紅茶的分界

#### Scenario: 分歧段順序忠實呈現

- **WHEN** 使用者檢視蜜香紅茶與紅烏龍的分歧段
- **THEN** 蜜香紅茶呈現「揉捻 → 發酵」，紅烏龍呈現「揉捻 → 發酵 → 炒菁」，烏龍三款呈現「炒菁 → 揉捻」，三者不被強制對齊為同一順序

#### Scenario: 每款茶的四態組合正確

- **WHEN** 檢視 5 款茶各自的工序狀態
- **THEN** 狀態組合與 `design.md` 1.2 節的矩陣完全一致：`ferment` 僅 black／redOolong 有；`fix` 僅 black 為 skipped 且在 redOolong 位於分歧段末端；`roast` 於 sijichun 為 skipped、於 oolong 為 optional；`witherSun`、`shake`、`dryFirst`、`ballRoll`、`dryFinal` 於全部 5 款茶皆為非 skipped

### Requirement: 五茶製程對照表

頁面 SHALL 提供一張涵蓋全部 5 款茶的製程對照表，欄位至少包含：製法家族、發酵度、浪菁、**炒菁**、獨立發酵工序、外型、焙火、產地／海拔、**來源**、風味。產地與海拔 SHALL 取自 `src/data/products.ts`，不另立事實來源。

發酵度 SHALL 以分級（輕／全／重）表示；依決策 ① 方案 B，SHALL NOT 標示發酵百分比或任何未經確認的溫度、時數。

對照表 SHALL 使用語意化 `<table>` 標籤（非 div 模擬），以利 AI 檢索解析。

#### Scenario: 對照表資料與商品資料一致

- **WHEN** 對照表顯示四季春的產地與海拔
- **THEN** 其值與 `src/data/products.ts` 中該品項的 `origin`／`altitude` 相同（南投名間松柏嶺、300m）

#### Scenario: 炒菁欄位凸顯唯一差異

- **WHEN** 使用者檢視「炒菁」列
- **THEN** 僅蜜香紅茶為 ✗，其餘四款為 ✓——此列是五款茶最鋒利的結構差異

#### Scenario: 外型欄位全為球形

- **WHEN** 使用者檢視「外型」列
- **THEN** 五款茶皆為球形，包含蜜香紅茶

#### Scenario: 表格在窄螢幕可用

- **WHEN** 使用者以 375px 寬度瀏覽對照表
- **THEN** 表格可橫向捲動，頁面本身不產生水平捲動

### Requirement: 產地來源誠實標示

四季春（南投名間松柏嶺）與紅烏龍（台東鹿野）為合作茶農供應、非自家製作。頁面 SHALL 為每款茶顯示來源徽章，區分「自家茶園」與「合作茶農」，並標示具體產地。

合作茶農供應的茶款，其製程敘述 SHALL 使用產地口吻（例如「松柏嶺的做法」），SHALL NOT 使用第一人稱宣稱為自家工序。

來源徽章 SHALL 以中性資訊樣式呈現（與其他規格標籤同級），SHALL NOT 使用警示色或免責聲明語氣。

#### Scenario: 合作茶款標示來源

- **WHEN** 使用者選擇「四季春」
- **THEN** 顯示來源徽章「合作茶農．南投名間松柏嶺」，且該款製程文案不出現「我們的師傅」等自家第一人稱敘述

#### Scenario: 自家茶款標示來源

- **WHEN** 使用者選擇「阿里山高山烏龍茶」
- **THEN** 顯示來源徽章「自家茶園．阿里山梅山」

#### Scenario: 徽章不呈現為免責聲明

- **WHEN** 使用者檢視合作茶款的來源徽章
- **THEN** 徽章樣式與自家茶款的徽章同級（同尺寸、同色系家族），不使用紅色、警告圖示或「非本場製作」等否定語氣

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

`/process` SHALL 為每款茶輸出一份 `HowTo` JSON-LD，`step` SHALL 依該茶的**實際順序**排列。`skipped` 狀態的工序 SHALL NOT 出現在結構化資料中——結構化資料描述真實作法，不是教學對比。`HowTo.name` SHALL 依 locale 對應中英名稱，與 `src/data/products.ts` 的 `name`／`nameEn` 一致。

所有 JSON-LD SHALL 經 `src/lib/seo.ts` 的 `jsonLdString()` 序列化；頁面 metadata SHALL 沿用 `langAlternates("/process")`。

每款茶的區段 SHALL 具備穩定的 `id` anchor（如 `#black`），使 AI 檢索可引用至段落層級。

#### Scenario: 紅茶的 HowTo 不含炒菁

- **WHEN** 爬蟲解析 `/process` 中蜜香紅茶的 HowTo 節點
- **THEN** 其 `step` 陣列不含「炒菁」，含「發酵」與「布球團揉」，且「揉捻」排在「發酵」之前

#### Scenario: 五份 HowTo 皆輸出

- **WHEN** 爬蟲解析 `/process` 的 HTML 原始碼
- **THEN** 可取得 5 份 HowTo 節點，分別對應 5 款茶

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

依決策 ① 方案 B，新增茶款（蜜香紅茶、紅烏龍）與新增工序（`ferment`、`dryFirst`、`ballRoll`、`dryFinal`）SHALL 只呈現工序說明、原理與**設備名稱**，SHALL NOT 出現任何溫度、時數、次數或發酵百分比。

現有烏龍流程既有的參數（`steps.*.detail` 中的溫度與時間）SHALL 保留——那些是已確認的自家做法。

任何新增參數 SHALL 僅來自店主確認，SHALL NOT 由實作端推估後以「本場做法」語氣呈現。

**不寫參數的工序 SHALL 改寫為判斷依據，SHALL NOT 以含糊語句帶過。**判斷依據指師傅據以決定「何時算完成」的可觀察徵象（葉色、香氣轉變、手感、外觀），例如「看葉色由綠轉紅、菁味退去轉出花果香」。「發酵至適當程度」「充分乾燥」等無可觀察內容的句子 SHALL NOT 通過驗收。

#### Scenario: 新增工序不出現數字

- **WHEN** 使用者檢視蜜香紅茶的「發酵」工序
- **THEN** 卡片呈現工序說明與原理，不出現任何時數、溫度或百分比數字

#### Scenario: 不寫參數但也不含糊

- **WHEN** 驗收者檢視任一無參數工序的 `detail` 文案
- **THEN** 該文案包含至少一項可觀察的判斷徵象（葉色、香氣、手感或外觀的具體轉變），而非「適當」「充分」「足夠」等空詞

#### Scenario: 既有參數保留

- **WHEN** 使用者檢視高山烏龍的「炒菁」工序
- **THEN** 既有的溫度與時間描述仍然存在，未因本次改版被移除
