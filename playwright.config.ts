import { defineConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
const mockPort = process.env.PLAYWRIGHT_MOCK_PORT || "39173";
const apiPort = process.env.PLAYWRIGHT_API_PORT || "39174";
function chromiumExecutable(): string | undefined {
  for (const candidate of [process.env.CHROMIUM_PATH, process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, "chromium", "chromium-browser", "google-chrome"]) {
    if (candidate) {
      if (candidate.startsWith("/")) return candidate;
      try { return execFileSync("which", [candidate], { encoding: "utf8" }).trim() || undefined; } catch { /* try next candidate */ }
    }
  }
  return undefined;
}
const executablePath = chromiumExecutable();
export default defineConfig({
  testDir: "./tests",
  testIgnore: "builds/**",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${mockPort}`,
    ...(process.env.NGROK_SKIP_WARNING ? { extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } } : {}),
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
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
