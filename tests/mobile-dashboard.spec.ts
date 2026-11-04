import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

const mobileViewports = [320, 375, 390, 430];
const externalBuild = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const mobileTab = (page: Page, name: string) => page.getByRole("tablist", { name: "Visualização do painel" }).getByRole("tab", { name });

async function openMunicipalRanking(page: Page) {
  await page.getByRole("button", { name: /^Sudeste ·/ }).click();
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();
  await expect(page.locator(".geo")).toHaveCount(92);
}

for (const width of mobileViewports) {
  test(`navegação mobile completa em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await login(page);

    const nav = page.getByRole("tablist", { name: "Visualização do painel" });
    await expect(nav).toBeVisible();
    await expect(mobileTab(page, "Mapa")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("Dengue");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("2026");

    await mobileTab(page, "Filtros").click();
    await expect(page.locator("#mobile-panel-filters")).toBeVisible();
    await expect(page.locator(".mobile-dashboard-context")).toContainText("Dengue");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("2026");

    await page.locator("#mobile-panel-filters").getByLabel("Mês", { exact: true }).selectOption("2");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("fev.");
    await mobileTab(page, "Mapa").click();
    await expect(page.locator(".map-card")).toBeVisible();
    await openMunicipalRanking(page);
    if (externalBuild) {
      await expect(page.locator(".query-state")).not.toContainText("Não foi possível carregar os dados");
    } else {
      await expect(page.locator(".query-state")).toContainText("Sem registros");
    }

    // Restore the available recorte before validating the ranking interaction.
    await mobileTab(page, "Filtros").click();
    await page.locator("#mobile-panel-filters").getByLabel("Mês", { exact: true }).selectOption("1");
    await mobileTab(page, "Mapa").click();
    await page.getByRole("button", { name: "Brasil", exact: true }).click();
    await openMunicipalRanking(page);
    await mobileTab(page, "Ranking").click();
    await expect(page.locator("#mobile-panel-ranking")).toBeVisible();
    await expect(page.locator(".mobile-dashboard-context")).toContainText("Dengue");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("jan.");
    await expect(page.locator("#mobile-panel-ranking")).toContainText(/\d+ notificações/);

    await page.locator("#mobile-panel-ranking").getByRole("button", { name: /Campos dos Goytacazes/ }).click();
    await mobileTab(page, "Mapa").click();
    await expect(page.getByRole("heading", { name: "Distritos de Campos dos Goytacazes" })).toBeVisible();
    await expect(page.locator(".map-context")).toContainText(/\d+ notificações/);

    const layout = await page.evaluate(() => {
      const navBox = document.querySelector<HTMLElement>(".mobile-dashboard-nav")?.getBoundingClientRect();
      const main = document.querySelector("main");
      return {
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        bottomPadding: main ? Number.parseFloat(getComputedStyle(main).paddingBottom) : 0,
        navHeight: navBox?.height ?? 0,
      };
    });
    expect(layout.horizontalOverflow).toBeFalsy();
    expect(layout.bottomPadding).toBeGreaterThanOrEqual(layout.navHeight);
  });
}

test("mobile suporta orientação e altura reduzida sem perder a navegação", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole("tablist", { name: "Visualização do painel" })).toBeVisible();
  await expect(mobileTab(page, "Mapa")).toBeVisible();
  await expect(mobileTab(page, "Filtros")).toBeVisible();
  await expect(mobileTab(page, "Ranking")).toBeVisible();
  await expect(page.locator(".mobile-dashboard-context")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("abas mobile são operáveis por teclado e preservam foco", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await login(page);
  const filtersTab = mobileTab(page, "Filtros");
  await filtersTab.focus();
  await expect(filtersTab).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mobile-panel-filters")).toBeVisible();
  await expect(filtersTab).toHaveAttribute("aria-selected", "true");
  const mapTab = mobileTab(page, "Mapa");
  await mapTab.focus();
  await page.keyboard.press("Space");
  await expect(mapTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".map-card")).toBeVisible();
});

test("desktop mantém o layout lateral e não mostra a barra mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await expect(page.locator(".mobile-dashboard-nav")).toBeHidden();
  await expect(page.locator(".mobile-dashboard-context")).toBeHidden();
  await expect(page.locator(".desktop-panel")).toBeVisible();
});
