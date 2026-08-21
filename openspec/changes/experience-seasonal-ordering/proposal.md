# 提案：體驗卡片的季節排序（讓萬鷺朝鳳在季節內自動站上第一張）

## Why

**現在體驗卡片的順序是寫死的。** `getExperienceTypes()` 是 `.order("id")`（[src/lib/experiences.ts:112](../../../src/lib/experiences.ts)），萬鷺朝鳳・茶山導覽是 id 6，所以它**永遠是最後一張**——而 8/18–10/11 正是它一年裡唯一有場次的 51 天。一年當中最該被看見的商品，在它唯一能賣的期間排在最尾巴。

商品列表也是同一個寫法（`src/lib/products.ts` 兩處 `.order("id")`），所以這不是體驗獨有的問題。

**最直覺的解法是最危險的**：把萬鷺朝鳳的 `id` 改成 1。**絕對不要這樣做**——`experience_sessions`、`experience_bookings`、`experience_reviews` 全都以 `experience_type_id` 外鍵指著它，改 id 會連坐既有的 20 筆場次與所有評價。

而純手動排序也不夠：季節開始要記得往上調、季節結束要記得調回來，一年兩次，**忘記的那次就是 12 月首頁還掛著萬鷺朝鳳**。今年是第一次上線，這種維護負債現在不建立，之後不會有人補。

## What Changes

### 一、三層排序，由自動優先

最終排序鍵：

```
(釘選中 ? 0 : 1),  (季節中 ? 0 : 1),  sort_order,  id
```

1. **`sort_order`（手動基準）**：後台可調的平時順序，`experience_types` 與 `products` 各增一欄。
2. **季節自動置頂**：體驗若處在自己的季節區間內，自動排到前面，季節一過自動退回。**業主只維護季節日期，排序自己會動。**
3. **`pinned_until`（臨時釘選，強制到期）**：連假、媒體報導、鳥況特別好的那一週可手動釘到最上面，**但一定要填到期日**——不提供「永久置頂」，因為永久置頂＝將來一定忘記撤下。

### 二、季節資料只有一份真相

季節區間存在 `experience_availability_windows`（`experience_type_id`、`start_date`、`end_date`、`note`，一款可多段）。**這張表同時被 `experience-open-class-request` 提案用來限制「客製開課請求只能申請季節內的日期」**——同一份設定，兩個功能都吃它。誰先實作誰建表，另一邊沿用。

### 三、季節在前台要看得出來

- **季節徽章＋倒數**：卡片上顯示「萬鷺朝鳳季・到 10/11 還有 51 天」。稀缺性是這款商品最強的轉換武器，而且**它是真的**，不需要製造。
- **季節結束不要讓卡片消失，改成「明年見」**：標示「本季已結束，明年 8 月再開」，並附「留 Email，開放時通知我」。今年第一次上線，**這批 Email 就是明年的開場資產**。
- 首頁的體驗區塊與 `/experiences` 的排序共用同一個函式，不要各排各的。

### 四、後台可以自己調

體驗管理頁提供上移／下移（或拖拉）調整 `sort_order`、設定 `pinned_until`、維護季節區間。

**BREAKING**：無。未設定 `sort_order` 的沿用 id 順序，未設定季節的行為與現在完全相同。

## 為什麼是「自動」而不是「提醒你去調」

季節排序有兩種做法：季節到了寄信提醒業主去後台調，或系統自己依日期判斷。

選自動，理由是**失敗模式的方向**。自動的失敗是「季節區間填錯或忘了續填」——結果是該款回到原位，跟現在一樣，沒有更糟。手動的失敗是「忘記調回來」——結果是**12 月的首頁第一張還在賣一個沒有場次的季節商品**，客人點進去看到空月曆。前者安全地退回現狀，後者安全地變成錯誤展示。**能自動的就不要靠記憶。**

## Capabilities

### New Capabilities

- `experience-seasonal-ordering`：體驗與商品列表的排序規則（手動基準、季節自動置頂、限期釘選）、季節區間資料、前台季節徽章與倒數、季節結束後的「明年見」呈現、後台的排序與季節維護介面。

### Modified Capabilities

（無。列表排序目前沒有既有規格描述其行為，屬新增。）

## Impact

**資料庫**

- `experience_types` 增欄：`sort_order INTEGER NOT NULL DEFAULT 100`、`pinned_until DATE`
- `products` 增欄：`sort_order INTEGER NOT NULL DEFAULT 100`（同一套機制，冬茶上市、春茶預購可用）
- 新表 `experience_availability_windows`（**與 `experience-open-class-request` 共用**；該 change 若先實作則此表已存在）

**程式**

- `src/lib/experiences.ts`：`getExperienceTypes()` 改排序；新增 `isInSeason()`、`currentWindow()`、`daysLeftInSeason()`
- `src/lib/products.ts`：兩處 `.order("id")` 一併改為 `sort_order, id`
- `src/app/experiences/page.tsx`、首頁體驗區塊：季節徽章與「明年見」狀態
- `src/app/admin/(protected)/experiences/`：排序調整與季節維護 UI
- `messages/zh.json`／`en.json`：季節徽章、倒數、明年見文案（雙語）

**刻意不做**

- **不改任何 `id`**。理由見 Why。
- **不做「季節內自動建立場次」**。場次要不要開是業主的判斷，系統只負責排序與呈現。
- **不做多維度排序規則引擎**（依熱度／評價／庫存自動排）。目前六款體驗、十來個商品，人工基準＋季節自動就夠了，規則引擎的維護成本遠大於收益。
