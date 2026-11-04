import { defineConfig } from "@playwright/test";
const mockPort = process.env.PLAYWRIGHT_MOCK_PORT || "39173";
const apiPort = process.env.PLAYWRIGHT_API_PORT || "39174";
export default defineConfig({
  testDir: "./tests",
  testIgnore: "builds/**",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${mockPort}`,
    ...(process.env.NGROK_SKIP_WARNING ? { extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } } : {}),
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : [
    {
      command: `npm run dev -- --port ${mockPort} --strictPort`,
      url: `http://127.0.0.1:${mockPort}`,
      env: { VITE_USE_MOCKS: "true" },
      reuseExistingServer: true,
    },
    {
      command: `npm run dev -- --port ${apiPort} --strictPort`,
      url: `http://127.0.0.1:${apiPort}`,
      env: { VITE_USE_MOCKS: "false" },
      reuseExistingServer: true,
    },
  ],
});
