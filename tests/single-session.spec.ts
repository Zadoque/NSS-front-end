import { test, expect } from "@playwright/test";

test("pede confirmação antes de substituir a sessão ativa", async ({ page }) => {
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/v1/auth/refresh", route =>
    route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", message: "Sessão ausente" } }),
  );
  await page.route("**/api/v1/auth/login", async route => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    requests.push(body);
    if (requests.length < 3) {
      await route.fulfill({
        status: 409,
        json: { code: "ACTIVE_SESSION", message: "Este usuário já está conectado em outra sessão." },
      });
      return;
    }
    await route.fulfill({
      json: { accessToken: "new-session", user: { id: 71, email: "user@nss.test", name: "Usuário" } },
    });
  });

  const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:39174";
  await page.goto(`${base}/login`);
  await page.getByLabel("E-mail", { exact: true }).fill("user@nss.test");
  await page.getByLabel("Senha", { exact: true }).fill("senha-certa");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("já está conectado");
  await expect(page.getByRole("button", { name: "Deslogar a outra sessão e entrar" })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);

  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Deslogar a outra sessão e entrar" })).toBeVisible();
  await page.getByRole("button", { name: "Deslogar a outra sessão e entrar" }).click();
  await expect(page).toHaveURL(/\/mapa$/);
  expect(requests).toHaveLength(3);
  expect(requests[0].replaceExistingSession).toBe(false);
  expect(requests[1].replaceExistingSession).toBe(false);
  expect(requests[2].replaceExistingSession).toBe(true);
});
