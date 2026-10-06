import { test, expect } from "@playwright/test";
import { parseCases } from "../src/data/apiDataSource";
import { caseColor } from "../src/features/dashboard/components/MapLegend";
import { login } from "./helpers";

for (const width of [375, 768, 1024, 1440]) {
  test(`navigation, coverage and drawer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await login(page);
    const areas = page.locator(".geo");
    await expect(areas).toHaveCount(5);
    await page.getByRole("button", { name: /^Norte ·/ }).click();
    await expect(areas).toHaveCount(5);
    await expect(page.locator(".map-context")).toContainText(
      "Sem cobertura nesta V1",
    );
    await page.getByRole("button", { name: /^Sudeste ·/ }).focus();
    await page.keyboard.press("Enter");
    await expect(areas).toHaveCount(4);
    await page.getByRole("button", { name: /^São Paulo ·/ }).click();
    await expect(areas).toHaveCount(4);
    await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).focus();
    await page.keyboard.press("Space");
    await expect(areas).toHaveCount(92);
    await expect(page.locator(".ranking")).toContainText("120 notificações");
    await page
      .getByRole("button", { name: /^Campos dos Goytacazes ·/ })
      .click();
    await expect(page.locator(".map-context")).toContainText("120 notificações");
    await page.screenshot({ path: `/tmp/nss-rj-${width}.png`, fullPage: true });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    if (width < 1024) {
      await expect(page.locator("dialog")).not.toBeVisible();
      await page.getByRole("button", { name: "Filtros e informações" }).click();
      await expect(
        page.getByRole("button", { name: "Fechar ×" }),
      ).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      expect(
        await page.evaluate(() => !!document.activeElement?.closest("dialog")),
      ).toBeTruthy();
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog")).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Filtros e informações" }),
      ).toBeFocused();
      await page.getByRole("button", { name: "Filtros e informações" }).click();
      await page.screenshot({ path: `/tmp/nss-drawer-${width}.png` });
    }
    const panel = width < 1024 ? page.locator("dialog") : page.locator("aside");
    await panel.getByLabel("Mês", { exact: true }).selectOption("2");
    if (width < 1024)
      await page.getByRole("button", { name: "Fechar ×" }).click();
    await expect(page.locator(".map-context")).toContainText("Sem registros");
    await expect(page.locator(".ranking")).not.toContainText("120 notificações");
    await page.getByRole("button", { name: "Brasil", exact: true }).click();
    await expect(areas).toHaveCount(5);
    await page.screenshot({
      path: `/tmp/nss-brazil-${width}.png`,
      fullPage: true,
    });
  });
}

test("zero, missing and invalid API records remain distinct", () => {
  const filters = { disease: "DENG", year: 2026, month: 1 };
  const item = {
    cdUf: "33",
    nmUf: "Rio de Janeiro",
    cdMun: "3301009",
    nmMun: "Campos dos Goytacazes",
    casesTotal: 0,
  };
  expect(
    parseCases({ ...filters, items: [item] }, filters).items[0].casesTotal,
  ).toBe(0);
  expect(parseCases({ ...filters, items: [] }, filters).items).toEqual([]);
  expect(caseColor(0)).not.toBe("#dce2e6");
  expect(() =>
    parseCases({ ...filters, items: [{ ...item, casesTotal: -1 }] }, filters),
  ).toThrow();
  expect(() =>
    parseCases({ ...filters, items: [item, item] }, filters),
  ).toThrow();
  expect(() =>
    parseCases({ ...filters, month: 2, items: [] }, filters),
  ).toThrow();
});

test("touch activation, outside dismissal and cartography error recovery", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
  });
  const page = await context.newPage();
  let failMap = true;
  await page.route("**/maps/brazil-regions.geojson", (route) =>
    failMap ? route.fulfill({ status: 503, body: "" }) : route.continue(),
  );
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar o mapa",
  );
  failMap = false;
  await page.getByRole("button", { name: "Tentar novamente" }).tap();
  await expect(page.locator(".geo")).toHaveCount(5);
  await page.getByRole("button", { name: /^Sudeste ·/ }).tap();
  await expect(page.locator(".geo")).toHaveCount(4);
  await page.screenshot({ path: "/tmp/nss-southeast-375.png", fullPage: true });
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).tap();
  await expect(page.locator(".geo")).toHaveCount(92);
  await page.getByRole("button", { name: "Filtros e informações" }).tap();
  await page.touchscreen.tap(5, 400);
  await expect(page.locator("dialog")).not.toBeVisible();
  await context.close();
});

test("real API mode keeps the municipal ranking unscoped after leaving Campos", async ({ page }) => {
  const municipalRequests: URL[] = [];
  await page.route("**/api/v1/diseases", (route) =>
    route.fulfill({ json: { items: ["DENG"] } }),
  );
  await page.route("**/api/v1/metadata", (route) =>
    route.fulfill({
      json: {
        availableYears: [2026],
        availableMonthsByYear: { "2026": [1] },
      },
    }),
  );
  await page.route("**/api/v1/epidemiology/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/municipalities")) {
      municipalRequests.push(url);
      return route.fulfill({
        json: {
          items: [
            { code: "3301009", name: "Campos dos Goytacazes", notificationsTotal: 120 },
            { code: "3302403", name: "Macaé", notificationsTotal: 48 },
          ],
          totalNotifications: 168,
          coverage: { status: "AVAILABLE", mappedNotificationsTotal: 168, unmappedNotificationsTotal: 0 },
        },
      });
    }
    return route.fulfill({
      json: {
        items: [{ code: "CG_DIST_SEDE", name: "Distrito Sede", notificationsTotal: 120 }],
        totalNotifications: 120,
        coverage: { status: "AVAILABLE", mappedNotificationsTotal: 120, unmappedNotificationsTotal: 0 },
      },
    });
  });

  await login(page, "http://127.0.0.1:5174");
  await page.getByRole("button", { name: /^Sudeste ·/ }).click();
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();
  await expect(page.locator(".ranking")).toContainText("Macaé");
  await page.getByRole("button", { name: /^Campos dos Goytacazes ·/ }).click();
  await expect(page.getByRole("heading", { name: "Distritos de Campos dos Goytacazes" })).toBeVisible();
  await page.getByRole("button", { name: /Voltar para municípios/ }).click();
  await expect(page.locator(".map-card").getByRole("heading", { name: "Rio de Janeiro" })).toBeVisible();
  await expect(page.locator(".ranking")).toContainText("Macaé");
  await page.getByRole("button", { name: /^Macaé ·/ }).click();
  await expect(page.locator(".ranking")).toContainText("120 notificações");
  expect(municipalRequests).not.toHaveLength(0);
  expect(municipalRequests.every((url) => !url.searchParams.has("municipalityCode"))).toBeTruthy();
});

test("map can enter and leave fullscreen mode", async ({ page }) => {
  await login(page);
  const fullscreen = page.getByRole("button", { name: "Abrir mapa em tela cheia" });
  await fullscreen.click();
  await expect(page.getByRole("button", { name: "Sair da tela cheia" })).toBeVisible();
  await expect(page.locator(".geographic-map")).toHaveJSProperty("nodeName", "DIV");
  await page.getByRole("button", { name: "Sair da tela cheia" }).click();
  await expect(page.getByRole("button", { name: "Abrir mapa em tela cheia" })).toBeVisible();
});
