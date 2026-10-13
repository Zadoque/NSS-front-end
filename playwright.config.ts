import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testIgnore: "builds/**",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5173",
    ...(process.env.NGROK_SKIP_WARNING ? { extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } } : {}),
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : [
    {
      command: "npm run dev -- --port 5173 --strictPort",
      url: "http://127.0.0.1:5173",
      env: { VITE_USE_MOCKS: "true" },
      reuseExistingServer: true,
    },
    {
      command: "npm run dev -- --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      env: { VITE_USE_MOCKS: "false" },
      reuseExistingServer: true,
    },
  ],
});
