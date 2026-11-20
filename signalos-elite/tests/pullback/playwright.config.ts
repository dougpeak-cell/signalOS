import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "mobile.spec.ts",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  outputDir: "..\\..\\test-results\\pullback",
  use: { ...devices["iPhone 13"], baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100", trace: "retain-on-failure" },
});
