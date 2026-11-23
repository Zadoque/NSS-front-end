import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("percorre as seis etapas da notificação veterinária sem persistir rascunho", async ({ page }) => {
  await page.route("**/api/v1/clinics*", (route) => route.fulfill({ json: { items: [{ id: "clinic-1", name: "Clínica NSS", cityIbge: "3304557" }] } }));
  await login(page);
  await page.getByRole("button", { name: "Notificação animal" }).click();
  await expect(page).toHaveURL(/\/notificacoes-animais$/);
  await expect(page.getByRole("heading", { name: "Nova notificação veterinária" })).toBeVisible();

  await page.getByRole("combobox").first().selectOption("clinic-1");
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await page.getByLabel("Espécie", { exact: true }).fill("1");
  await page.getByLabel("Castração", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await page.getByLabel("Raça", { exact: true }).fill("SRD");
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await page.getByRole("combobox").last().selectOption("YEARS");
  await page.getByLabel("Idade", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await page.getByLabel("Município IBGE de residência", { exact: true }).fill("3304557");
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await expect(page.getByText("Declaro que os dados têm fonte legítima")).toBeVisible();
  await expect(page.getByText("Clínica NSS")).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes("veterinary") || key.includes("draft")))).toEqual([]);
});

test("descarta o formulário quando outra aba troca a identidade da sessão", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.route("**/api/v1/auth/refresh", (route) => route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } }));
  await page.route("**/api/v1/auth/login", (route) => route.fulfill({ json: { accessToken: "session-one", user: { id: 1, email: "one@nss.test", name: "One" }, permissions: [] } }));
  await page.route("**/api/v1/diseases", (route) => route.fulfill({ json: { items: ["DENG"] } }));
  await page.route("**/api/v1/metadata", (route) => route.fulfill({ json: { availableYears: [2026], availableMonthsByYear: { "2026": [1] } } }));
  await page.route("**/api/v1/epidemiology/**", (route) => route.fulfill({ json: { items: [], totalNotifications: 0, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 0, unmappedNotificationsTotal: 0 } } }));
  await page.route("**/api/v1/clinics*", (route) => route.fulfill({ json: { items: [{ id: "clinic-1", name: "Clínica NSS" }] } }));
  await page.goto(`${base}/login`);
  await page.getByLabel("E-mail", { exact: true }).fill("one@nss.test");
  await page.getByLabel("Senha", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("button", { name: "Notificação animal" }).click();
  await page.getByRole("combobox").first().selectOption("clinic-1");
  await page.getByRole("button", { name: "Próxima etapa" }).click();
  await page.getByLabel("Espécie", { exact: true }).fill("1");

  const otherTab = await page.context().newPage();
  await otherTab.goto(`${base}/`);
  await otherTab.evaluate(() => localStorage.setItem("nss-auth-changed-v1", JSON.stringify({ type: "login", userId: 2, nonce: `${Date.now()}-other` })));
  await expect(page.getByRole("heading", { name: "Entrar no NSS" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nova notificação veterinária" })).not.toBeVisible();
  await otherTab.close();
});
