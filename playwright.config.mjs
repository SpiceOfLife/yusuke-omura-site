import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:4173",
    // ローカルで既存の Chromium を使うときだけ CHROMIUM_PATH を指定（CI では不要）
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.BASE_URL ? undefined : { command: "node scripts/serve.mjs", url: "http://localhost:4173/", reuseExistingServer: true },
});
