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
  await page.getByLabel("Município", { exact: true }).selectOption({ label: "Angra dos Reis" });
  await expect(page.locator(".map-context")).toContainText("Sem cobertura");
  await expect(page.locator(".ranking")).toContainText("120 notificações");
  await expect(page.locator(".ranking")).toContainText("48 notificações");
  expect(municipalRequests).not.toHaveLength(0);
  expect(municipalRequests.every((url) => !url.searchParams.has("municipalityCode"))).toBeTruthy();
});

test("continuous wheel and trackpad pinch retain zoom and pan after gesture", async ({ page }) => {
  await login(page);
  const viewport = page.locator(".map-viewport");
  await expect(page.locator(".geo")).toHaveCount(5);
  await viewport.scrollIntoViewIfNeeded();
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height / 2);
  const transform = page.locator(".rsm-zoomable-group");
  await page.mouse.wheel(0, -20);
  await expect(page.locator(".map-controls")).not.toContainText("Zoom 100%");
  // Sub-step wheel deltas must not round back to the starting scale.
  await page.waitForTimeout(250);
  const first = await transform.getAttribute("transform");
  expect(Number(first?.match(/scale\(([^)]+)\)/)?.[1])).toBeGreaterThan(1);
  await transform.dispatchEvent("wheel", { deltaY: -15, deltaMode: 0, ctrlKey: true, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 });
  await page.waitForTimeout(250);
  const pinched = await transform.getAttribute("transform");
  expect(Number(pinched?.match(/scale\(([^)]+)\)/)?.[1])).toBeGreaterThan(Number(first?.match(/scale\(([^)]+)\)/)?.[1]));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const dragged = await transform.getAttribute("transform");
  expect(dragged).not.toBe(pinched);
  await page.waitForTimeout(250);
  await expect(transform).toHaveAttribute("transform", dragged!);
  await page.getByRole("button", { name: "Redefinir zoom" }).click();
  await expect(page.locator(".map-controls")).toContainText("Zoom 100%");
});

test("mobile two-finger pinch changes scale without navigating", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await login(page);
  await expect(page.locator(".geo")).toHaveCount(5);
  await page.locator(".map-viewport").scrollIntoViewIfNeeded();
  const box = (await page.locator(".map-viewport").boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await context.newCDPSession(page);
  const points = (distance: number) => [{ x: x - distance, y, id: 1 }, { x: x + distance, y, id: 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(30) });
  for (const distance of [40, 50, 60]) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(distance) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(".map-controls")).toContainText("Zoom 200%");
  await expect(page.locator(".geo")).toHaveCount(5);
  await context.close();
});

test("fullscreen fallback and ranking on the left on large screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new Error("unsupported"));
  });
  await login(page);
  await page.getByLabel("Região", { exact: true }).selectOption("SE");
  await page.getByLabel("Estado", { exact: true }).selectOption("RJ");
  await expect(page.locator(".ranking")).toBeVisible();
  const ranking = (await page.locator(".ranking").boundingBox())!;
  const map = (await page.locator(".map-card").boundingBox())!;
  expect(ranking.x + ranking.width).toBeLessThan(map.x);
  await page.getByRole("button", { name: "Abrir mapa em tela cheia" }).click();
  await expect(page.locator(".map-expanded")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".map-expanded")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Abrir mapa em tela cheia" })).toBeVisible();
});

test("map can enter and leave fullscreen mode", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /^Sudeste ·/ }).click();
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();
  const fullscreen = page.getByRole("button", { name: "Abrir mapa em tela cheia" });
  await fullscreen.click();
  await expect(page.getByRole("button", { name: "Sair da tela cheia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar na navegação do mapa" })).toBeVisible();
  await expect(page.locator(".geographic-map")).toHaveJSProperty("nodeName", "DIV");
  await page.getByRole("button", { name: "Sair da tela cheia" }).click();
  await expect(page.getByRole("button", { name: "Abrir mapa em tela cheia" })).toBeVisible();
});

test("disease filter shows the full name followed by its code", async ({ page }) => {
  await login(page);
  const disease = page.getByLabel("Doença", { exact: true }).first();
  await expect(disease.locator("option")).toHaveText([
    "Dengue · DENG",
    "Febre maculosa · FMAC",
    "Toxoplasmose congênita · TOXC",
  ]);
  await expect(disease).toHaveAttribute("title", "Dengue · DENG");
});
