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
        tea: {
          green: "#7D9B84",
          "green-light": "#A3BFA8",
          "green-pale": "#C8DDD0",
          "green-mist": "#EBF3EE",
          "green-dark": "#5C7A67",
          cream: "#F5F0E8",
          "cream-light": "#FAF7F2",
          "cream-dark": "#EDE8DC",
          text: "#3D4A42",
          "text-light": "#6B8872",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Noto Sans TC", "sans-serif"],
        serif: ["var(--font-serif)", "Noto Serif TC", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
