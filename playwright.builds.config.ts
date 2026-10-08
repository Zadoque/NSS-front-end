import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/builds",
  workers: 1,
  use: {
    baseURL: process.env.NSS_BUILD_TEST_BASE_URL || "http://127.0.0.1:5183",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    trace: "retain-on-failure",
  },
  webServer: process.env.NSS_BUILD_TEST_BASE_URL ? undefined : {
    // Flags contraditórias provam que MODE, e não uma flag antiga, decide prod-mock.
    command: "npm run build && VITE_DATA_SOURCE=api VITE_USE_MOCKS=false npm run build:prod-mock && node tests/builds/serve.mjs",
    url: "http://127.0.0.1:5183",
    env: { VITE_DATA_SOURCE: "mock", VITE_USE_MOCKS: "true", VITE_API_BASE_URL: "https://api.invalid" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
