import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // .claude/hooks/*.test.js 是設計成用 `node` 直接跑的獨立腳本（見檔頭與
    // WORKLOG 的驗收判準），不是 vitest suite；不排除會讓 vitest 報
    // "No test suite found" 而使整個 npm run test 變紅。
    exclude: ["node_modules", "e2e", ".claude"],
  },
});
