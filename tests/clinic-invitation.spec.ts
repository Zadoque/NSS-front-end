import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("aceita convite autenticado e remove o token do fragmento do histórico", async ({ page }) => {
  const token = "invitation-token-test";
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  let acceptedBody: { token?: string } | null = null;
  await page.route("**/api/v1/auth/refresh", (route) => route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } }));
  await page.route("**/api/v1/auth/login", (route) => route.fulfill({ json: {
    accessToken: "playwright-access-token", expiresIn: 3600,
    user: { id: 7, email: "representative@nss.test", name: "Representante" }, permissions: [],
  } }));
  await page.route("**/api/v1/auth/csrf", (route) => route.fulfill({ status: 204, headers: { "Set-Cookie": "XSRF-TOKEN=csrf-test; Path=/; SameSite=Strict" } }));
  await page.route("**/api/v1/clinics/invitations/accept", async (route) => {
    acceptedBody = route.request().postDataJSON() as { token?: string };
    await route.fulfill({ json: { id: "clinic-1", name: "Clínica de teste" } });
  });

  await page.goto(`${base}/aceitar-convite#token=${token}`);
  await page.getByLabel("E-mail", { exact: true }).fill("representative@nss.test");
  await page.getByLabel("Senha", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/aceitar-convite$/);
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
  await expect(page.getByRole("heading", { name: "Aceitar convite de clínica" })).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Aceitar convite" }).click();

  await expect(page.getByRole("status")).toContainText("Clínica de teste");
  expect(acceptedBody).toEqual({ token });
});
