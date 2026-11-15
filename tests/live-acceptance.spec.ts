import { test, expect } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
const token = process.env.PLAYWRIGHT_ACCESS_TOKEN;

test.describe("homologação integrada real", () => {
  test.skip(!baseUrl || !token, "Requer PLAYWRIGHT_BASE_URL e PLAYWRIGHT_ACCESS_TOKEN");

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, json: { code: "UNAUTHORIZED", message: "Sessão ausente" } }),
    );
    await page.route("**/api/v1/auth/login", (route) =>
      route.fulfill({ json: { accessToken: token, expiresIn: 900, user: { id: 1, email: "qa@nss.local", name: "QA" }, permissions: [] } }),
    );
    await page.goto(`${baseUrl}/login`);
    await page.getByLabel("E-mail", { exact: true }).fill("qa@nss.local");
    await page.getByLabel("Senha", { exact: true }).fill("qa");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/mapa$/);
  });

  async function chooseCachoeiro(page: import("@playwright/test").Page) {
    await page.locator("#region").selectOption("SE");
    await expect(page.locator('#state option[value="32"]')).toHaveText("Espírito Santo");
    await page.locator("#state").selectOption("32");
    await page.locator("#municipality").selectOption("3201209");
    await expect(page.locator(".map-context")).toContainText("Cachoeiro", { timeout: 15_000 });
  }

  test("SIFA Cachoeiro mostra a causa verificável das 353 não localizadas", async ({ page }) => {
    await page.locator('select[id$="-disease"]').first().selectOption("SIFA");
    await page.locator('select[id$="-year"]').first().selectOption("2025");
    await page.locator('select[id$="-month"]').first().selectOption("ALL");
    await chooseCachoeiro(page);
    await expect(page.locator(".map-context")).toContainText("353 notificações", { timeout: 20_000 });
    await expect(page.locator(".map-context")).toContainText("sem identificador de unidade suficiente");
    await expect(page.locator(".map-context")).toContainText("Dados SINAN extraídos em");
    await page.screenshot({ path: "/tmp/nss-sifa-cachoeiro-real.png", fullPage: true });
  });

  test("enquadramento de bairros mantém polígonos legíveis e pontos discretos", async ({ page }) => {
    await chooseCachoeiro(page);
    const district = page.locator("#district");
    await expect(district).toBeVisible({ timeout: 15_000 });
    const options = await district.locator("option").evaluateAll((items) => items.map((item) => ({ value: item.value, text: item.textContent ?? "" })));
    const districtOption = options.find((item) => item.value === "IBGE_DIST_320120905")
      ?? options.find((item) => item.value.startsWith("IBGE_DIST_"));
    test.skip(!districtOption, "Cachoeiro não tem distrito cartográfico neste snapshot");
    await district.selectOption(districtOption!.value);
    await expect(page.locator('[aria-label="Notificações por bairro da notificação"]:visible')).toBeVisible({ timeout: 20_000 });
    const radii = await page.locator('.geographic-map circle').evaluateAll((items) => items.map((item) => Number(item.getAttribute("r"))));
    expect(radii.filter((value) => Number.isFinite(value)).every((value) => value <= 3.5)).toBeTruthy();
    expect(await page.locator('.geographic-map path').count()).toBeGreaterThan(0);
    const tijuca = page.getByRole("button", { name: /Tijuca/ }).filter({ hasText: "notificações" }).first();
    if (await tijuca.count()) {
      await tijuca.click();
      await expect(page.locator(".map-context")).toContainText("sem polígono cartográfico");
    }
    await page.screenshot({ path: "/tmp/nss-cachoeiro-neighborhoods-real-after.png", fullPage: true });
  });
});

test.describe("renovação real da sessão", () => {
  test.skip(!baseUrl || !process.env.LIVE_AUTH_EMAIL || !process.env.LIVE_AUTH_PASSWORD, "Requer credenciais de homologação");

  test("renova o access token quando uma consulta recebe 401", async ({ page }) => {
    let forced401 = false;
    let refreshResponses = 0;
    await page.route("**/api/v1/epidemiology/**", async (route) => {
      if (!forced401) {
        forced401 = true;
        await route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } });
      } else await route.continue();
    });
    page.on("response", (response) => {
      if (response.url().endsWith("/api/v1/auth/refresh") && response.status() === 200) refreshResponses += 1;
    });
    await page.goto(`${baseUrl}/login`);
    await page.getByLabel("E-mail", { exact: true }).fill(process.env.LIVE_AUTH_EMAIL!);
    await page.getByLabel("Senha", { exact: true }).fill(process.env.LIVE_AUTH_PASSWORD!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/mapa$/);
    await expect.poll(() => refreshResponses).toBeGreaterThan(0);
    await expect(page.locator(".geo")).toHaveCount(5, { timeout: 15_000 });
  });
});
