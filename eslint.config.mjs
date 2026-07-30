import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * ESLint 9 flat config。
 *
 * 本檔在 2026-07 之前不存在：`package.json` 的 lint script 是 `next lint`，
 * 而 Next 16 已移除該指令，於是 `npm run lint` 一直跑不起來（參數被當目錄解析）。
 * 現改為直接呼叫 `eslint`，並補上 flat config——`judgment.md` 的最低門檻第 2 條
 * 要靠它把關，沒有它那條規則等於空轉。
 */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "public/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];
