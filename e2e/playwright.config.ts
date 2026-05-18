import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
