# 霧抉茶設計系統

> **這份文件是約束，不是建議。** 任何新介面（自己做、外包、或用生成工具產的）都要能對照本文
> 逐條檢查。改動本文前先讀「如何修改本文」一節。
>
> 單一真相：token 值以 `src/app/globals.css` 的 `:root` 與 `tailwind.config.ts` 為準，
> 本文若與程式碼不符，**以程式碼為準**並回頭修本文。

---

## 一、三條設計原則

### 1. 產地即證據，介面是茶席

信任來自真實：紀實照片、海拔、產地、40 年敘事永遠是視覺主角。米白為席、深綠為器。
**禁止裝飾性特效搶戲**——repo 裡閒置的 `border-beam` 這類效果不進前台。

### 2. 交易時刻，清晰壓倒氣氛

凡涉及錢與名額（結帳、預約付款、折抵、退款梯度、剩餘名額），**資訊層級、AA 對比、
tabular 數字、五態完整性**（載入／空／錯誤／成功／禁用）優先於品牌氛圍。

> 氛圍留給瀏覽，確定感留給付款。

### 3. 一份茶單，前後台同源，且 token 平台無關

前台商店、管理後台、Email、OG 圖共用同一套 token。任何新 token 必須同時在
「前台敘事密度」與「後台數據密度」下成立。

**平台無關是硬性條件**：設計決策存在 CSS 變數層，元件只引用語意名。

```
❌ className="rounded-2xl shadow-sm p-6"      // 字面值，一行都帶不到 React Native
✅ className="rounded-card shadow-resting p-card"  // 語意名，可導出成 RN theme
```

理由：`--radius-card: 1rem` 可用腳本轉成 React Native 的 theme 物件；`rounded-2xl` 不行。
現在做是改名字，等 App 開案再做是重寫全站。

---

## 二、色彩

### 2.1 品牌色階（`tailwind.config.ts` 的 `tea.*`）

| Token | 值 | 用途 |
|---|---|---|
| `tea-green` | `#7D9B84` | 主品牌綠。**大面積底色、圖示、裝飾用；不承載文字** |
| `tea-green-light` | `#A3BFA8` | 淺化的品牌綠 |
| `tea-green-pale` | `#C8DDD0` | 分隔線、邊框 |
| `tea-green-mist` | `#EBF3EE` | 最淺的綠底（hover 底、提示區） |
| `tea-green-dark` | `#5C7A67` | 深綠，按鈕 hover 態 |
| `tea-green-ink` | `#58745F` | **互動綠**：連結、按鈕底、圖示。四種淺底皆 ≥4.54 |
| `tea-cream` | `#F5F0E8` | 米白主底 |
| `tea-cream-light` | `#FAF7F2` | 最淺米白（頁面底） |
| `tea-cream-dark` | `#EDE8DC` | 邊框、分隔 |
| `tea-text` | `#3D4A42` | 主文字、深色區塊底 |
| `tea-text-light` | `#6B8872` | 淺化文字。**不合 AA，勿用於內文**（見 2.3） |
| `tea-text-muted` | `#637169` | **次要內文**。四種淺底皆 ≥4.52 |

### 2.2 語意層（`globals.css` 的 `:root`）

元件應優先用語意名，而非直接寫 `tea-*`。

| 語意 token | 指向 | 對比 |
|---|---|---|
| `--background` | cream-light `#FAF7F2` | — |
| `--foreground` | text `#3D4A42` | 8.71:1 |
| `--card` / `--popover` | `#FFFFFF` | 卡片浮在米白上才有層次 |
| `--primary` | green-ink `#58745F` | 白字 5.15 |
| `--primary-foreground` | cream-light | 4.82:1 |
| `--secondary` / `--accent` | green-mist `#EBF3EE` | — |
| `--secondary-foreground` | green-ink | 4.56:1 |
| `--muted` | cream `#F5F0E8` | — |
| `--muted-foreground` | text-muted `#637169` | 4.52:1 |
| `--destructive` | `#BB483F` | 白字 5.11、當文字 ≥4.50 |
| `--border` / `--input` | cream-dark `#EDE8DC` | — |
| `--ring` | green-ink `#58745F` | 淺底皆 ≥4.54 |
| `--chart-1..4` | 茶綠明度序列 | — |
| `--chart-5` | 土黃 | 類別型圖表的區辨色，避免全綠無法分辨 |

### 2.3 對比度基準（強制）

- **內文 ≥ 4.5:1**（WCAG AA）
- **大字（≥18.66px 粗體 或 ≥24px）與 UI 元件 ≥ 3:1**
- 交易頁面（結帳、付款、退款）一律以內文標準檢查，不適用大字寬鬆值（原則 2）

**已知不合格——業主拍板的已知取捨，不列入待辦**（實算結果，非估計）：

| 現況寫法 | 對比 | 若要改，合規落點 |
|---|---|---|
| `bg-tea-green` + `text-white`（含首頁主 CTA） | **3.05** | `bg-tea-green-dark`（4.74）或 `bg-tea-green-ink`（5.15） |
| `text-tea-green` 在米白上（「查看全部」等連結） | **2.85** | `text-tea-green-ink`（4.82） |
| `text-tea-text-light` 內文（全站大量） | **3.43** | `text-tea-text-muted`（4.80） |

**這三項曾於 2026-08-04 全面遷移（39 檔），但於 2026-08-06 依小江決定回退。**
理由是遷移後整體明度過沉，與品牌想要的清透茶席感不符。這是業主對「品牌調性 vs
AA 合規」的權衡，屬**已知取捨**而非待修缺陷——請勿再自行「修正」它。

若日後要重做，`git revert` 那個 revert commit 即可還原全部 39 檔的替換，
再依需要放亮（例如按鈕改用 `green-dark` 而非 `green-ink`，圖示與 ≥24px 大字
只需 3.0 門檻、可保留 `tea-green`）。

`tea-green-ink` 與 `tea-text-muted` 兩色仍保留在色盤中，作為需要合規時的落點。

### 2.4 深色模式

`.dark` 的值已備齊且全數通過 AA，但**目前不會生效**——`tailwind.config.ts` 沒有 `darkMode`
設定、專案也沒有 ThemeProvider。這是刻意的：0 個業務元件支援 `dark:`，真開等於全站再走一遍，
而真實需求只有「後台清晨看單」。

**預設模式是淺色**，品牌識別建立在 cream 底上。深色實作綁在後台重構那一波。

---

## 三、字體

| 變數 | 字型 | 來源 |
|---|---|---|
| `--font-latin` | Geist | `next/font`（拉丁字） |
| `--font-sans` | Noto Sans TC | `next/font`（中文內文） |
| `--font-serif` | Noto Serif TC | `next/font`（標題） |

- `font-sans` 的實際鏈：`Geist → Noto Sans TC → sans-serif`。拉丁字走 Geist、中文回退 Noto。
- `h1`–`h3` 由 `globals.css` 強制襯線，不需逐處加 `font-serif`。
- **已載入字重**：Sans `400/500/600/700`、Serif `400/600/700`。用其他字重會觸發瀏覽器假造。
- **禁止**在 CSS 用 `@import` 拉字型（render-blocking）。要加字型一律走 `next/font`。

### 3.1 字級尺度（內文端）

| Token | 值 | 行高 | 用途 |
|---|---|---|---|
| `text-caption` | 12px | 1.6 | 徽章、法律條款、表格註記 |
| `text-label` | 14px | 1.55 | 介面標籤、按鈕、表單、表格內容 |
| `text-body` | 16px | 1.8 | 一般內文 |
| `text-body-lg` | 18px | 1.85 | 敘事段落、導言 |

**為什麼要建這一階**：診斷時前台 `text-xs` 210 處 ＋ `text-sm` 345 處＝**555**，
而 `text-base` 只有 **14** 處——整站幾乎沒有正常閱讀大小的文字，
四十年的故事用後台的字級在講。這是啞鈴分布，不是尺度。

**行高刻意比 Tailwind 預設寬**。預設 `text-base` 是 1.5，對中文敘事太緊；
CJK 舒適區在 1.7–1.9。**放寬行高的效果不亞於放大字級**，兩者要一起做。

**套用判準（三分法，不是全部放大）**：

| 類型 | 處理 | 例 |
|---|---|---|
| 敘事型內文 | 升到 `text-body` / `text-body-lg` | 品牌故事、商品描述、體驗簡介、預約須知 |
| 介面標籤 | 維持 `text-label`(14px) | 按鈕、表單 label、「查看全部」、麵包屑 |
| 真 metadata | 維持 `text-caption`(12px) | 徽章、eyebrow 小標籤、編號、時長人數 |

> `tracking-[0.3em] uppercase` 的 eyebrow 小標籤**刻意保持 12px**——
> 它的作用是節奏標記不是閱讀內容，放大反而破壞層次。

**標題端不在本波動**，沿用 Tailwind 既有尺度。既有的 `text-sm` / `text-xs` 也保留可用，
這是漸進遷移不是一次換掉全站；新寫的介面請直接用語意 token。

---

## 四、非顏色 token

質感八成來自這一層，不是配色。命名由現況統計反推。

### 4.1 圓角

| Token | 值 | 用途 |
|---|---|---|
| `rounded-inline` | `0.5rem` | 內嵌訊息條、後台輸入框 |
| `rounded-control` | `0.75rem` | 表單控制元件、次要按鈕、chip |
| `rounded-card` | `1rem` | 卡片、面板 |
| `rounded-showcase` | `1.5rem` | 大型展示區塊 |
| `rounded-pill` | `9999px` | 藥丸 CTA、徽章、頭像 |

### 4.2 陰影

**一律用茶墨色 `rgb(61 74 66)`，不用 Tailwind 預設的純黑。** 純黑陰影壓在米白上會透出灰調，
暖色陰影才不會讓米白顯髒——這是「看起來貴」與「看起來預設」的實際差別。

| Token | 用途 |
|---|---|
| `shadow-resting` | 卡片靜置 |
| `shadow-raised` | 卡片 hover |
| `shadow-float` | 下拉、浮層 |
| `shadow-modal` | 對話框、燈箱 |

> ⚠️ boxShadow 的 key **不可命名為 `card`**：`card` 已是顏色 key，同名會讓 Tailwind 同時產出
> 「陰影」與「陰影顏色」兩條 `.shadow-card`，後者在後會覆寫前者。

### 4.3 動態

| Token | 值 | 用途 |
|---|---|---|
| `duration-fast` | 150ms | 顏色、透明度等微互動 |
| `duration-base` | 200ms | 標準互動（全站主力） |
| `duration-slow` | 300ms | 位移、展開收合 |
| `duration-reveal` | 500ms | 大面積變化，如圖片 `group-hover:scale` |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 一般 |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | 離場 |

`prefers-reduced-motion: reduce` 已全站支援（動態走 CSS 變數，改寫變數即收斂）。

### 4.4 間距節奏

| Token | 值 | 用途 |
|---|---|---|
| `*-gutter` | `1rem` | 版面左右安全邊 |
| `*-card` | `1.5rem` | 卡片內距 |
| `*-card-lg` | `2rem` | 大卡片內距 |
| `*-section` | `4rem` | 區塊垂直節奏（行動） |
| `*-section-lg` | `6rem` | 區塊垂直節奏（桌機） |

版面慣例：`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`（左右內距寫法全站 54 處、`max-w-7xl` 29 處；
其餘容器寬度依內容取 `max-w-2xl` ~ `max-w-5xl`）。勿另創新的內距組合。

---

## 五、外包視覺／生成工具的交付規格

**不要接受程式碼交付。** 每個生成工具都自帶一套隱形設計系統（它習慣的圓角、陰影、灰階）。
貼一頁進來就是把第二套系統偷渡進 codebase；貼三頁，就會變成「每頁單看都好看，整站不像同一個品牌」。

### 交付物

| 階段 | 交付 |
|---|---|
| 定調 | Hero 方案**圖**（3 張），不要 code |
| 說明 | 文字說明所用的字級比例、間距節奏、陰影強度 |
| 落地 | 由本專案把圖翻譯成 token 與元件 |

### 給生成工具的約束（直接貼）

```
品牌：台灣阿里山高山茶，家族四十年，自產自銷。
調性：安靜、可信、有手作痕跡；不是精品百貨的華麗。

色彩：主綠 #7D9B84、互動綠 #58745F、米白 #F5F0E8 / #FAF7F2、文字 #3D4A42。
      只出這三個色相的階調，不要引入新色相。
字體：中文標題 Noto Serif TC、內文 Noto Sans TC；拉丁字 Geist。
      可用字重僅 400/500/600/700。
圓角：8 / 12 / 16 / 24px 與全圓四階，不要出現其他值。
陰影：一律用 rgb(61 74 66) 的低透明度，不要用純黑。
對比：任何文字對背景 ≥ 4.5:1。
攝影：紀實茶園實拍（信任）與去背棚拍商品（銷售）雙軌，不要 3D、不要插畫。

輸出 Hero + 商品卡 + 一個 section 的圖，並文字說明你用的字級比例、
間距節奏與陰影強度。不要輸出程式碼。
```

---

## 六、邊界與待辦

### 目前的施工邊界

**只動前台與 token 層，後台不碰。** 後台有 746 處硬編碼 hex（前台僅 31 處，量體 24 倍），
且後台是茶農家庭每天在用的工作台，風險模式不同——混做會失控。後台獨立排一波。

### 待遷移清單

- ~~39 個檔案的 AA 遷移~~ → **已回退，改列為業主拍板的已知取捨（見 2.3），不再是待辦**
- [ ] 既有 `rounded-2xl` / `shadow-sm` 等字面值改語意 token（首頁已完成，作為參考實作）
- [ ] 後台 746 處硬編碼 hex
- [ ] 門面五件打磨：ProductCard、場次日曆、金額摘要卡、Header、**付款轉跳與 `/order/result`
      的等待／過渡狀態**
- [ ] Email 樣板脫離 token 體系（`src/lib/email.ts` 內聯 hex）
- [x] ~~favicon 與 app icon~~ → 已完成，見下方「品牌識別資產」
- [ ] 深色模式實作（綁後台重構）

### 品牌識別資產

| 檔案 | 用途 | 產生方式 |
|---|---|---|
| `src/app/favicon.ico` | 舊版瀏覽器、爬蟲慣例路徑 | 由 `icon.svg` 光柵化，內含 16/32/48 三個尺寸 |
| `src/app/icon.svg` | 現代瀏覽器分頁列（可縮放） | 手繪 |
| `src/app/apple-icon.tsx` | iOS 主畫面 180×180 | `ImageResponse`（同 `opengraph-image.tsx` 慣例） |

**favicon 不是 Header logo 的等比縮小版**，這是刻意的。Header 那顆（`Header.tsx:63-79`）有
雙層綠與三條 1.5px 莖線，在 16px 會糊成一團，且淺色葉子放在淺色分頁列上幾乎看不見。
favicon 改為：深色 chip（`#3D4A42`）＋單層淺綠葉（`#C8DDD0`，對比 6.52）＋一條中脈。
深底讓它在淺色與深色分頁列都站得住。

**中脈的描邊寬度是實測出來的**：初版 1.8（於 32 viewBox）在 16px 會被抗鋸齒吃掉，
加粗到 2.6 才在 16/32/64/180 全部可辨。改動 icon 時請重跑這個檢查，不要只看大圖好不好看。

`favicon.ico` 若要重新產生（改了 `icon.svg` 之後）：用 `sharp`（Next.js 已內建相依）
逐尺寸原生渲染再手工組 ICO 容器——直接從大圖降採樣，小尺寸會糊。

### 已知但刻意不處理

`globals.css` 與 `tw-animate-css` 含 Tailwind 4 語法（`@theme inline`、`@custom-variant`、
`@utility`），本專案是 Tailwind **3.4.19**，這些不生成任何 CSS 並原樣漏進產物。
**影響為零**——相關 class 只被 `src/components/ui/select.tsx` 使用，而該檔全站零引用。
要清理需連帶處理未使用的 shadcn 元件與相依，屬獨立的死碼清除任務。

---

## 七、如何修改本文

1. **token 值改動先改程式碼**（`globals.css` / `tailwind.config.ts`），再回頭同步本文。
   本文與程式碼不符時一律以程式碼為準。
2. **新增顏色前先算對比**。不要憑感覺——`#7D9B84` 看起來很像可以配白字，實際只有 3.05。
3. **驗證 Tailwind 產物一律用 `npm run build` 的 `.next` 產物**。
   `npx tailwindcss` CLI 讀不到本專案的 TS config，跑出來的東西沒有參考價值。
4. 三條設計原則的改動**先問使用者**——那是品牌決策，不是技術決策。

---

**相關文件**：`.claude/WORKLOG.md`（決策脈絡與實測數據）、
`.claude/playbooks/lessons.md`（踩過的坑）、`openspec/specs/`（功能規格）
