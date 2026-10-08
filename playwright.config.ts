import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testIgnore: "builds/**",
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: [
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
