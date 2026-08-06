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
          "text-light": "#6B8872",
          "text-muted": "#637169",  // 次要內文：四種淺底皆 ≥4.52，彩度低於 green-ink 不會被誤讀為連結
          "text-faint": "#9CA89E",  // 第三層：空狀態與載入提示（「目前尚無訂單」）。
                                    // 比 text-light 再淡一階，讓「沒有東西」退到最後面
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
      },
    },
  },
  plugins: [],
};

export default config;
