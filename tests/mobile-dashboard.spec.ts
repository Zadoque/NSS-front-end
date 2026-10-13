import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

const mobileViewports = [320, 375, 390, 430];
const externalBuild = Boolean(process.env.PLAYWRIGHT_BASE_URL);

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
    await expect(page.getByRole("tab", { name: "Mapa" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("Dengue");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("2026");

    await page.getByRole("tab", { name: "Filtros" }).click();
    await expect(page.locator("#mobile-panel-filters")).toBeVisible();
    await expect(page.locator(".mobile-dashboard-context")).toContainText("Dengue");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("2026");

    await page.locator("#mobile-panel-filters").getByLabel("Mês", { exact: true }).selectOption("2");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("fev.");
    await page.getByRole("tab", { name: "Mapa" }).click();
    await expect(page.locator(".map-card")).toBeVisible();
    await openMunicipalRanking(page);
    if (externalBuild) {
      await expect(page.locator(".query-state")).not.toContainText("Não foi possível carregar os dados");
    } else {
      await expect(page.locator(".query-state")).toContainText("Sem registros");
    }

    // Restore the available recorte before validating the ranking interaction.
    await page.getByRole("tab", { name: "Filtros" }).click();
    await page.locator("#mobile-panel-filters").getByLabel("Mês", { exact: true }).selectOption("1");
    await page.getByRole("tab", { name: "Mapa" }).click();
    await page.getByRole("button", { name: "Brasil", exact: true }).click();
    await openMunicipalRanking(page);
    await page.getByRole("tab", { name: "Ranking" }).click();
    await expect(page.locator("#mobile-panel-ranking")).toBeVisible();
    await expect(page.locator(".mobile-dashboard-context")).toContainText("Dengue");
    await expect(page.locator(".mobile-dashboard-context")).toContainText("jan.");
    await expect(page.locator("#mobile-panel-ranking")).toContainText(/\d+ notificações/);

    await page.locator("#mobile-panel-ranking").getByRole("button", { name: /Campos dos Goytacazes/ }).click();
    await page.getByRole("tab", { name: "Mapa" }).click();
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
  await expect(page.getByRole("tab", { name: "Mapa" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Filtros" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Ranking" })).toBeVisible();
  await expect(page.locator(".mobile-dashboard-context")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("abas mobile são operáveis por teclado e preservam foco", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await login(page);
  const filtersTab = page.getByRole("tab", { name: "Filtros" });
  await filtersTab.focus();
  await expect(filtersTab).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mobile-panel-filters")).toBeVisible();
  await expect(filtersTab).toHaveAttribute("aria-selected", "true");
  const mapTab = page.getByRole("tab", { name: "Mapa" });
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
