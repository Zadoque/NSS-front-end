import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const apiTestBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";

test("mantém a sessão ao falhar o encerramento remoto", async ({ page }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Exige o servidor API local.");
  await login(page, apiTestBaseUrl);
  await page.route("**/api/v1/auth/logout", route => route.fulfill({ status: 503, json: { code: "AUTH_UNAVAILABLE" } }));
  const dialog = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  const failure = await dialog;
  expect(failure.message()).toContain("Não foi possível encerrar");
  await failure.accept();
  await expect(page).toHaveURL(/\/mapa$/);
  // The failed logout deliberately keeps the session; allow the dashboard
  // bootstrap to settle on slower CI runners before asserting that invariant.
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toBeVisible({ timeout: 15_000 });
});
