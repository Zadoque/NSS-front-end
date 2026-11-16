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
    await page.waitForTimeout(400);
    await page.locator("#state").selectOption("32");
    await page.waitForTimeout(400);
    await page.locator("#municipality").selectOption("3201209");
    await expect(page.locator(".map-context")).toContainText("Cachoeiro", { timeout: 15_000 });
  }

  async function chooseCampos(page: import("@playwright/test").Page) {
    await page.locator("#region").selectOption("SE");
    await page.waitForTimeout(300);
    await page.locator("#state").selectOption("33");
    await page.waitForTimeout(300);
    await page.locator("#municipality").selectOption("3301009");
    await expect(page.locator(".map-context")).toContainText("Campos dos Goytacazes", { timeout: 15_000 });
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
    const tijuca = page.getByRole("button", { name: /Tijuca/i }).filter({ hasText: "notificações" }).first();
    if (await tijuca.count()) {
      await tijuca.click();
      await expect(page.locator(".map-context")).toContainText("não possui polígono cartográfico");
    }
    await page.screenshot({ path: "/tmp/nss-cachoeiro-neighborhoods-real-after.png", fullPage: true });
  });

  test("Campos enquadra o Distrito Sede e limita o custo do arraste", async ({ page }) => {
    await chooseCampos(page);
    await page.locator("#district").selectOption("CG_DIST_SEDE");
    await expect(page.locator(".map-context")).toContainText("Distrito Sede", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Bairros/localidades da notificação", exact: true })).toBeVisible({ timeout: 20_000 });

    const mapMetrics = await page.locator(".geographic-map svg").evaluate((svg) => {
      const paths = [...svg.querySelectorAll("path")];
      const boxes = paths.map((path) => {
        try { return path.getBBox(); } catch { return null; }
      }).filter((box): box is DOMRect => Boolean(box && box.width > 0 && box.height > 0));
      const left = Math.min(...boxes.map((box) => box.x));
      const right = Math.max(...boxes.map((box) => box.x + box.width));
      const top = Math.min(...boxes.map((box) => box.y));
      const bottom = Math.max(...boxes.map((box) => box.y + box.height));
      return {
        pathCount: paths.length,
        widthRatio: (right - left) / svg.viewBox.baseVal.width,
        heightRatio: (bottom - top) / svg.viewBox.baseVal.height,
        markerCount: svg.querySelectorAll("circle").length,
      };
    });
    expect(mapMetrics.pathCount).toBeGreaterThan(0);
    expect(Math.max(mapMetrics.widthRatio, mapMetrics.heightRatio)).toBeGreaterThan(0.45);
    expect(mapMetrics.markerCount).toBeLessThan(400);

    await page.evaluate(() => {
      (window as Window & { __nssLongTasks?: number[] }).__nssLongTasks = [];
      new PerformanceObserver((list) => {
        const target = window as Window & { __nssLongTasks?: number[] };
        target.__nssLongTasks?.push(...list.getEntries().map((entry) => entry.duration));
      }).observe({ type: "longtask", buffered: false });
    });
    const svgBox = await page.locator(".geographic-map svg").boundingBox();
    expect(svgBox).not.toBeNull();
    await page.mouse.move(svgBox!.x + svgBox!.width * 0.5, svgBox!.y + svgBox!.height * 0.5);
    await page.mouse.down();
    for (let step = 1; step <= 18; step += 1) {
      await page.mouse.move(svgBox!.x + svgBox!.width * (0.5 + step * 0.01), svgBox!.y + svgBox!.height * (0.5 + step * 0.004));
    }
    await page.mouse.up();
    const longTasks = await page.evaluate(() => (window as Window & { __nssLongTasks?: number[] }).__nssLongTasks ?? []);
    expect(Math.max(0, ...longTasks)).toBeLessThan(300);
    await page.screenshot({ path: "/tmp/nss-campos-sede-neighborhoods-real.png", fullPage: true });
  });

  test("celular mostra a mira e troca a seleção CNES com exclusividade", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await chooseCampos(page);
    await page.locator("#district").selectOption("CG_DIST_SEDE");
    await expect(page.locator(".map-crosshair")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".map-crosshair-label")).toContainText("Bairro:");
    const fontSize = await page.locator(".map-crosshair-label").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(18);

    const groups = page.locator('.geographic-map [aria-label*="estabelecimentos CNES nesta área"]');
    await expect(groups.first()).toBeVisible({ timeout: 20_000 });
    await groups.first().click();
    await expect(page.getByRole("region", { name: "Estabelecimentos no agrupamento selecionado" })).toContainText("estabelecimentos no agrupamento");
    if (await groups.count() > 1) {
      await groups.nth(1).click();
      await expect(page.getByRole("region", { name: "Estabelecimentos no agrupamento selecionado" })).toHaveCount(1);
    }
    await page.screenshot({ path: "/tmp/nss-campos-mobile-crosshair-real.png", fullPage: true });
  });

  test("não cria overflow horizontal nos quatro tamanhos críticos", async ({ page }) => {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await chooseCachoeiro(page);
      await page.screenshot({ path: `/tmp/nss-cachoeiro-${width}.png`, fullPage: false });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    }
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
