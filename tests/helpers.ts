import { expect, type Page } from "@playwright/test";

export async function login(page: Page, baseUrl = "") {
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", message: "Sessão ausente" } }),
  );
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      json: {
        accessToken: "playwright-access-token",
        expiresIn: 3600,
        user: { email: "demo@nss.local", name: "Usuário demonstrador" },
      },
    }),
  );
  await page.route("**/api/v1/auth/logout", (route) => route.fulfill({ status: 204, body: "" }));
  await page.goto(`${baseUrl}/login`);
  await expect(page.getByRole("heading", { name: "Entrar no NSS" })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("demo@nss.local");
  await page.getByLabel("Senha", { exact: true }).fill("NSS-DEMO-2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.getByRole("heading", { name: "Um olhar sobre o território" })).toBeVisible();
}
