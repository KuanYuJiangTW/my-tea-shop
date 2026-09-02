import type { Config } from "tailwindcss";

const config: Config = {
  // 掃整個 src，不要逐目錄列舉。
  // 原本只列 pages/components/app，於是把 class 字串抽到 src/lib/admin-status.ts
  // 之後，只被該檔引用的 class（status-warn / status-warn-soft）完全不會生成——
  // 徽章會變成沒有底色。逐目錄列舉等於在「共用模組不可含 class 字串」這件事上
  // 埋一個沒有人知道的隱含規則。
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  safelist: [
    "from-amber-100", "to-yellow-200",
    "from-green-100", "to-emerald-200",
    "from-orange-100", "to-amber-200",
    "from-amber-200", "to-orange-300",
    "from-red-200", "to-rose-300",
    "from-gray-100", "to-stone-200",
  ],
  theme: {
    extend: {
      colors: {
        // 既有十色階的值一律未動（改了就是全站視覺位移）。
        // 新增兩色是為了讓「文字／互動元素」有 AA 合規的落點——實算結果：
        //   green      #7D9B84 白字 3.05、當文字在米白上 2.85  → 兩者皆不合格
        //   text-light #6B8872 在米白上 3.43                  → 不合格
        // 這兩色仍可用於**大面積底色、圖示、裝飾**，只是不該承載文字。
        tea: {
          green: "#7D9B84",
          "green-light": "#A3BFA8",
          "green-pale": "#C8DDD0",
          "green-mist": "#EBF3EE",
          "green-dark": "#5C7A67",
          "green-ink": "#58745F",   // 互動綠：連結／按鈕底／圖示，四種淺底皆 ≥4.54
          cream: "#F5F0E8",
          "cream-light": "#FAF7F2",
          "cream-dark": "#EDE8DC",
          text: "#3D4A42",
          "text-deep": "#2E3833",   // 墨色按鈕的 hover／按壓態（白字 12.14）。
                                    // 2026-09-02 新增：一般（非轉換）按鈕從 green-dark 改用墨色後，
                                    // 需要一階更深的 hover——實測 12 個對照站沒有一個把
                                    // 「不夠鮮的彩色」用在次要按鈕上，次要行動一律中性深色或外框。
          "text-light": "#6B8872",
          "text-muted": "#637169",  // 次要內文：四種淺底皆 ≥4.52，彩度低於 green-ink 不會被誤讀為連結
          "text-faint": "#9CA89E",  // 第三層：空狀態與載入提示（「目前尚無訂單」）。
                                    // 比 text-light 再淡一階，讓「沒有東西」退到最後面
        },

        // 產品線轉換重音 —— 刻意不放進 tea-*，理由與 status-* 同源：
        // tea-* 是**品牌識別**（到處都在，識別靠重複），cta-* 是**「你現在在哪一條線」**
        // 的轉換重音（極小面積，重音靠稀有）。混在一起就等於沒有重音。
        //
        // 只用在**真正的轉換行動**——買茶、訂體驗。瀏覽、導流、通用操作一律維持
        // tea-green-ink，否則面積一超過 3% 就不再是重音。目前套用 15 顆按鈕。
        //
        // 色相選擇有實測依據：八個高質感品牌的重音色裡，**五個落在 H29–61 的土紅～焦糖**
        // （Belmond #C04E37 H33、Loro Piana #9D5248 H29、たねや #BF0000 H29、
        // Aesop #945C26 H61、一保堂 #BA876A H51），三個是冷色
        // （八代目儀兵衛 #2A4073 H265 紺、KINTO #007A8A H211、六善 #642656 H337）。
        // 這裡各取一支：土紅給茶葉線（呼應烏龍的焙火），紺給體驗線（呼應阿里山的雲海晨霧，
        // 也讓「霧抉茶」這個名字第一次在視覺上被兌現）。
        //
        // ⚠️ **彩度不套莫蘭迪**（2026-09-02 修正，初版把場的規則誤套到重音上）。
        // 重音成不成立看的不是它自己多鮮，而是它**比所在的場高出多少**。
        // 實測 12 站的重音落差（重音 C 減掉該站底色 C）中位數是 +.096，而且那 12 站的
        // 「中間帶 .02–.05」佔比**全部是 0%**——色盤要嘛中性、要嘛真的鮮，不停在中間。
        //
        // 我們的場比他們難：他們的非重音彩度只有 .000–.017，我們是一片 .048 的綠，
        // 所以重音必須**比他們更鮮**才有同樣的知覺落差。
        //   cta-tea   C.140  落差 +.092　達樣本中位數，且仍清楚是弁柄土紅
        //   cta-visit C.092  落差 +.044　八代目儀兵衛在高級米上用的同一個值
        //
        // 紺為什麼只到 .092：sRGB 裡深藍的彩度天花板遠低於紅，要再往上就得同時提明度，
        // 一提就從「日本傳統紺」變成「一般網頁藍」。這是色域限制不是選色偷懶。
        // `-soft` 的明度取 L.960 而非更深，是被**次要文字**卡住的：
        // 區塊淡底上會出現 tea-text-muted(#637169)，它需要 ≥4.5。
        // 初版 #E9EDF4／#F6EAE5（L.945）只有 4.37／4.35，不合格——
        // 那兩個值是照「配墨字」算的（7.9），忘了淡底區塊裡也有次要文字。
        // 調亮到 L.960 後：紺淡底 4.57、焙火淡底 4.55，兩者皆過。
        cta: {
          tea: "#B34D31",   "tea-dark": "#973317",   "tea-soft": "#FBEFEA",   // 焙火紅：白字 5.22／7.50；淡底 墨字 8.26／次要字 4.55
          visit: "#2A4073", "visit-dark": "#1E2E53", "visit-soft": "#EEF2F9", // 紺：白字 10.10／13.37；淡底 墨字 8.29／次要字 4.57
        },

        // 狀態語意色 —— 刻意不放進 tea-*。
        // 狀態需要與品牌色可區辨，本來就該在色盤外；把它們混進 tea-* 會讓
        // 「這個綠是品牌還是狀態」變成每次都要重想的問題。
        // `-soft` 是底色、無後綴是文字色，成對使用：bg-status-warn-soft text-status-warn
        status: {
          idle: "#7A6855",          "idle-soft": "#EDE8DC",   // 新訂單、待處理
          info: "#2D5A47",          "info-soft": "#D5E8DA",   // 備貨中、已確認
          warn: "#92400E",          "warn-soft": "#FEF3C7",   // 待付款、庫存不足
          danger: "#7A4545",        "danger-soft": "#E0D5D5", // 已取消、付款失敗
          done: "#3D6B46",          "done-soft": "#C8DDD0",   // 已付款
        },
        // 製茶工序色票 —— `/process` 專用，沿用 status 的 `-soft` 成對慣例。
        // 值原封不動取自 Tailwind 預設色（amber/green/orange/red 的 50 與 600/700），
        // 這是 2026-08-08 小江拍板保留的：它們表達工序的「溫度」
        // （日光、爐火、發酵），彩度 0.137–0.194 明顯高於品牌色 tea-green 的 0.0476。
        // **不要把它們收進 tea-* 或 status-***：不是品牌色也不是狀態色，
        // 是這一頁的敘事色票。要動的話是整組重新設計，不是逐個替換。
        process: {
          sun: "#D97706",      "sun-soft": "#FFFBEB",     // 日光萎凋
          indoor: "#15803D",   "indoor-soft": "#F0FDF4",  // 室內萎凋
          fire: "#EA580C",     "fire-soft": "#FFF7ED",    // 炒菁
          ferment: "#B91C1C",  "ferment-soft": "#FEF2F2", // 發酵
          roast: "#B45309",    "roast-soft": "#FFFBEB",   // 初乾、焙火（底色與日光同值）
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: "var(--destructive)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      fontFamily: {
        // 拉丁字走 Geist，中文由 Noto Sans TC 接手（瀏覽器逐字回退）。
        // 這是既有的視覺結果，過去靠 fallback 鏈碰巧成立，現在明確宣告。
        sans: ["var(--font-latin)", "var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
      },

      // 字級只定義內文端四階；標題端沿用 Tailwind 既有尺度，不在本波動。
      // 既有的 text-sm / text-xs 保留可用——這是漸進遷移，不是一次換掉全站。
      fontSize: {
        caption:   ["var(--text-caption)",  { lineHeight: "var(--leading-caption)" }],
        label:     ["var(--text-label)",    { lineHeight: "var(--leading-label)" }],
        body:      ["var(--text-body)",     { lineHeight: "var(--leading-body)" }],
        "body-lg": ["var(--text-body-lg)",  { lineHeight: "var(--leading-body-lg)" }],
      },

      // 字距：CJK 大標用正字距，理由與實測數據見 globals.css 的 --tracking-display。
      // 既有的 tracking-wide / tracking-widest 保留可用，這裡是語意版。
      letterSpacing: {
        display: "var(--tracking-display)",
        eyebrow: "var(--tracking-eyebrow)",
      },

      // ── 非顏色 token 的 utility 對照（值一律讀 CSS 變數，見 globals.css :root）──
      // 既有的 rounded-2xl / shadow-sm / duration-200 都保留可用，這裡是「語意版」，
      // 讓元件寫 rounded-card 而不是 rounded-2xl——語意名才帶得到 React Native。
      borderRadius: {
        inline: "var(--radius-inline)",
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        showcase: "var(--radius-showcase)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        // 刻意不叫 `card`：`card` 已是 colors 的 key（shadcn 語意色），
        // 兩者同名會讓 Tailwind 同時產出「陰影」與「陰影顏色」兩條 .shadow-card，
        // 後者在後、會覆寫 --tw-shadow。目前碰巧仍成立，但那是巧合不是設計。
        resting: "var(--shadow-resting)",
        raised: "var(--shadow-raised)",
        float: "var(--shadow-float)",
        modal: "var(--shadow-modal)",
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        base: "var(--motion-base)",
        slow: "var(--motion-slow)",
        reveal: "var(--motion-reveal)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        exit: "var(--ease-exit)",
      },
      spacing: {
        gutter: "var(--space-gutter)",
        card: "var(--space-card)",
        "card-lg": "var(--space-card-lg)",
        section: "var(--space-section)",
        "section-lg": "var(--space-section-lg)",
        "section-xl": "var(--space-section-xl)",
      },
    },
  },
  plugins: [],
};

export default config;
