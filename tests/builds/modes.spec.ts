import { test, expect } from "@playwright/test";

test.describe("prod-mock sem backend", () => {
  let apiRequests: string[];
  test.beforeEach(async ({ page }) => {
    apiRequests = [];
    page.on("request", request => {
      if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
    });
    await page.route("**/api/**", route => route.abort());
  });
  test.afterEach(() => expect(apiRequests).toEqual([]));

  test("entrada pública, mapa, ranking e logout sem credenciais", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Neste acesso, o mapa usa um snapshot estático/)).toBeVisible();
    await page.goto("/login");
    await expect(page.locator("input")).toHaveCount(0);
    await page.getByRole("button", { name: "Entrar na demonstração" }).click();
    await expect(page).toHaveURL(/\/mapa$/);
    await page.getByRole("button", { name: /^Sudeste ·/ }).click();
    await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();
    await expect(page.locator(".ranking li")).toHaveCount(4);
    await expect(page.locator(".ranking")).not.toContainText("Sem registros");
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });
  for (const path of ["/primeiro-acesso", "/esqueci-senha", "/redefinir-senha", "/admin/usuarios", "/primeiro-acesso/"]) {
    test(`bloqueia ${path} por URL direta`, async ({ page }) => {
      await page.goto(`${path}?token=nao-enviar`);
      await expect(page.getByRole("heading", { name: "Recurso indisponível na demonstração" })).toBeVisible();
      await expect(page.locator("input")).toHaveCount(0);
    });
  }
});

test("production mantém autenticação real mesmo com flags mock", async ({ page }) => {
  const refresh = page.waitForRequest("**/api/v1/auth/refresh");
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: {} }));
  await page.goto("http://127.0.0.1:5184/login");
  await refresh;
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar na demonstração" })).toHaveCount(0);
});
