import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
    },
  },
  plugins: [],
};

export default config;
