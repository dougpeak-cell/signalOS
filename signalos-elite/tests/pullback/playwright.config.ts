import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "mobile.spec.ts",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  outputDir: "..\\..\\test-results\\pullback",
  use: { ...devices["iPhone 13"], baseURL: "http://localhost:3100", trace: "retain-on-failure" },
});
