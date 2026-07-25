# 設計文件：製茶過程頁多茶款擴充

## 1. 內容模型

### 1.1 三個製法家族

分類依據是**工序結構差異**（哪幾步存在），不是品種或行銷分類。這是整個設計的骨架。

| 家族 key | 名稱 | 成員 | 結構特徵 |
|---|---|---|---|
| `partialBall` | 部分發酵球型烏龍 | 高山烏龍、金萱、四季春 | 有浪菁、有炒菁、團揉成球 |
| `fullStrip` | 全發酵條型紅茶 | 蜜香紅茶 | **無浪菁、無炒菁**，多一道獨立「發酵」，條型不團揉 |
| `heavyBall` | 重發酵球型烏龍 | 紅烏龍 | 重發酵（近紅茶）**但仍炒菁**，團揉成球，重焙火 |

> 為什麼不用「氧化度」當分類軸：氧化度是連續光譜，切不出「炒菁存不存在」這個離散的工序分歧，而後者才是使用者看得到、記得住的差異。

### 1.2 工序主軸（superset，10 步）

所有茶款共用這一條軸，各自標記三態之一。

| # | 工序 key | 名稱 | oolong | jinxuan | sijichun | black | redOolong |
|---|---|---|---|---|---|---|---|
| 01 | `pick` | 採摘 | 共通 | 共通 | 共通 | **特有**(著蜒芽葉) | 共通 |
| 02 | `witherSun` | 日光萎凋 | 共通 | 共通 | 共通 | **跳過** | 共通 |
| 03 | `witherIndoor` | 室內萎凋 | 共通 | 共通 | 共通 | **強化**(長時) | **強化**(長時) |
| 04 | `shake` | 浪菁 | 共通 | 共通 | 共通 | **跳過** | **強化**(重攪拌) |
| 05 | `ferment` | 發酵 | — | — | — | **特有** | **特有**(重發酵) |
| 06 | `fix` | 炒菁 | 共通 | 共通 | 共通 | **跳過** | 共通 |
| 07 | `roll` | 揉捻 | 共通 | 共通 | 共通 | 共通(條型) | 共通 |
| 08 | `ballRoll` | 團揉 | 共通 | 共通 | 共通 | **跳過** | 共通 |
| 09 | `roast` | 焙火 | 共通(輕) | **強化**(極輕) | 共通(輕) | **跳過** | **強化**(重焙) |
| 10 | `sort` | 揀枝包裝 | 共通 | 共通 | 共通 | 共通 | 共通 |

相對現況的變動：新增 `ferment`（發酵）與 `ballRoll`（團揉）兩步；現有 8 步的 key 全部沿用，**既有 i18n 文案不作廢**。

三態定義：

- **共通**（`common`）：此茶有這一步，用共通描述
- **強化／特有**（`accent`）：此茶在這一步有專屬做法，顯示該茶專屬文案並加視覺強調
- **跳過**（`skipped`）：此茶沒有這一步，**卡片保留但降階顯示（劃線／低透明度），並必須給出原因**

> `skipped` 保留卡片而非隱藏，是本設計的核心。隱藏＝使用者不知道少了什麼；保留並說明＝製造對比記憶點。這也是為什麼工序編號固定用主軸編號（01–10），不因茶款重新編號——編號跳號本身就是資訊。

### 1.3 對照表欄位（GEO 主力內容）

| 欄位 | 高山烏龍 | 金萱 | 四季春 | 蜜香紅茶 | 紅烏龍 |
|---|---|---|---|---|---|
| 製法家族 | 部分發酵球型 | 部分發酵球型 | 部分發酵球型 | 全發酵條型 | 重發酵球型 |
| 發酵度 | 輕 | 輕 | 輕 | 全 | 重 |
| 浪菁 | ✓ | ✓ | ✓ | ✗ | ✓✓ |
| 炒菁 | ✓ | ✓ | ✓ | ✗ | ✓ |
| 外型 | 球型 | 球型 | 球型 | 條型 | 球型 |
| 焙火 | 輕 | 極輕 | 輕 | 不焙 | 重 |
| 產地／海拔 | 阿里山 1,200m | 阿里山 800m | 名間 300m | 阿里山 1,200m | 鹿野 350m |
| 風味 | 蘭花香 | 奶香 | 花香 | 蜜香 | 果香蜜韻 |

數值一律取自 `src/data/products.ts`，不另立事實來源。發酵度用「輕／全／重」分級而非百分比——百分比屬 proposal 決策點 ①（真實參數）範圍，未定案前不寫數字。

### 1.4 工藝取捨（專業感的來源）

每款茶一則「為什麼要這樣做」，這是本頁與競品內容農場的差異點。內容待決策點 ① 確認後定稿，方向：

- **金萱**：乳香是品種自帶的揮發性成分，焙火一重就蓋掉 → 所以金萱是 5 款裡焙得最輕的
- **蜜香紅茶**：蜜香來自小綠葉蟬叮咬後茶樹的防禦反應（著蜒）→ 要蜜香就**不能用藥**，蟲害在此是必要條件
- **紅烏龍**：重發酵之後仍然炒菁，是它與紅茶的分水嶺——保住烏龍的甘韻不流失
- **高山烏龍**：高海拔雲霧多、濕度高，日光萎凋的時間得看天走，不是照表操課
- **四季春**：品種早生、一年可採多次，是它價格親民的結構性原因（非品質妥協）

## 2. 頁面結構（IA）

```
Hero（沿用現有 bg-tea-green-mist 樣式）
  ↓
① 茶款選擇器（sticky，5 款）           ← 新增
  ↓
② 這款茶屬於哪個家族 + 一句話定位        ← 新增
  ↓
③ 工序主軸 10 步（三態渲染，依選中茶款）  ← 改造現有步驟區
  ↓
④ 這款茶的工藝取捨（1 則）              ← 新增
  ↓
⑤ 買這款茶 CTA → /products             ← 新增（補漏斗斷點）
  ↓
⑥ 5 茶製程對照表                       ← 新增（取代綠茶/白茶區塊）
  ↓
⑦ 茶山體驗 CTA                         ← 沿用現有
```

### 2.1 兩層 sticky 的處理

現況已有一層 sticky 步驟導覽（`ProcessContent.tsx:138`，動態同步 header 底部）。再加一層茶款選擇器會吃掉手機過多垂直空間。

**決定**：茶款選擇器與步驟導覽**合併為同一個 sticky 容器**，上排茶款（5 顆）、下排步驟（10 顆）。手機版步驟列改為橫向捲動（`overflow-x-auto`）而非現在的 `grid-cols-4` 兩排——10 步用 grid 會變三排，過高。

現有的 `stepBarRef` top 同步邏輯與 `IntersectionObserver` 捲動高亮（`ProcessContent.tsx:56-117`）整段保留，只換內容。

### 2.2 切換茶款時的動效

- 工序卡片以 `transition-all duration-300` 做狀態轉場，**不做整段 unmount/remount**——要讓使用者看見「炒菁那格被劃掉」的過程，這是設計意圖所在
- 切換後捲動位置維持不變（不自動回頂），使用者可停在同一步比較不同茶
- `prefers-reduced-motion` 時停用轉場

## 3. 視覺語彙（沿用既有，不另創）

| 用途 | class／值 | 來源 |
|---|---|---|
| 品牌主色／CTA | `bg-tea-green` `hover:bg-tea-green-dark` | `tailwind.config.ts` |
| 淺底區塊 | `bg-tea-green-mist` | 同上 |
| 深底區塊（對照表建議用） | `bg-tea-text` | 現有頁尾區塊 |
| 標題 | `font-serif text-3xl md:text-4xl font-bold text-tea-text` | `about/page.tsx` |
| 小 label | `text-tea-green text-xs tracking-[0.3em] uppercase` | `alishan-tea/page.tsx:143` |
| 主 CTA | `bg-tea-green hover:bg-tea-green-dark text-white px-8 py-3.5 rounded-full font-medium transition-colors shadow-sm` | `alishan-tea/page.tsx:169` |
| 卡片 | `bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow` | `about/page.tsx:141` |
| 5 茶漸層 | `from-green-100 to-emerald-200` 等 5 組 | `about/page.tsx:22-28`（已在 safelist） |

新增顏色一律從 `tea-*` 取；`skipped` 態用既有中性色（`text-tea-text-light` + `opacity-50` + `line-through`），不引入新色票。

> 註：`components.json` 雖有 shadcn `button`，但四個內容頁一律手刻 `<Link className="...rounded-full">`。本頁**延續手刻**，維持一致性。

## 4. 資料結構

新增 `src/data/tea-process.ts`，把「哪款茶在哪一步是什麼狀態」從 JSX 抽離為資料，避免 5×10 的條件判斷散在元件裡：

```ts
export type StepState = "common" | "accent" | "skipped";
export type TeaKey = "oolong" | "jinxuan" | "sijichun" | "black" | "redOolong";
export type FamilyKey = "partialBall" | "fullStrip" | "heavyBall";

export interface TeaProcess {
  key: TeaKey;
  family: FamilyKey;
  productId: number;          // 對應 src/data/products.ts，用於 CTA 導流
  steps: Record<StepKey, StepState>;
}
```

文案一律走 i18n（`messages/*.json`），此檔只存結構與關聯。i18n key 命名：

- 共通工序文案：沿用現有 `process.steps.<stepKey>.{name,desc,detail}`
- 茶款專屬文案：新增 `process.teaSteps.<teaKey>.<stepKey>.{desc,detail}`（僅 `accent` 態需要）
- 跳過原因：新增 `process.teaSteps.<teaKey>.<stepKey>.skipReason`
- 家族：`process.families.<familyKey>.{name,desc}`
- 對照表：`process.matrix.*`

`zh.json` 與 `en.json` 必須完全對稱（現況已對稱，47 個葉節點，不可退化）。

## 5. 結構化資料

每款茶輸出一份 `HowTo`（`schema.org/HowTo`），`step` 只含該茶實際執行的工序（`skipped` 不進 JSON-LD——結構化資料描述的是真實作法，不是教學對比）。

- 序列化一律經 `src/lib/seo.ts` 的 `jsonLdString()`（既有慣例，防 `</script>` 突破）
- metadata 沿用 `langAlternates("/process")`
- `HowTo.name` 依 locale 對應中英，與 `products.ts` 的 `name`／`nameEn` 一致

## 6. 明確不做的事（scope 邊界）

- **不改** `/products` 商品資料與價格
- **不新增**綠茶、白茶等未販售茶類的內容
- **不做**製茶影片／動畫插圖（需素材，另案）
- **不動** `experienceCta` 區塊的現有行為
- **不編造**任何溫度、時間、發酵百分比（見 proposal 決策點 ①）

## 7. 驗證方式

本頁不碰高風險區，但仍須：

1. `npm run test` 全綠（既有 26 檔／316 測試不得退化）
2. `npm run lint` 無新增錯誤（`git stash` 前後對比）
3. `npm run build` 成功
4. i18n 對稱性用程式比對 `zh.json`／`en.json` 的 `process` 子樹 key 集合，非肉眼
5. `checker` agent 獨立驗收（依 tasks.md 驗收條件逐條查證）
