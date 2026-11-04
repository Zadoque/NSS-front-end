import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { login } from "./helpers";

const manifest = JSON.parse(readFileSync("data/static-snapshot/manifest.json", "utf8"));
const rows = JSON.parse(readFileSync(`data/static-snapshot/${manifest.files.DENG.path}`, "utf8")) as Array<[number, number, string, string | null, string | null, string | null, string | null, string | null, number]>;
const januaryRows = rows.filter((row) => row[0] === 2026 && row[1] === 1 && ["M", "F", "I"].includes(row[3] ?? ""));
const expectedTotal = januaryRows.reduce((sum, row) => sum + row[8], 0);
const expectedCampos = januaryRows.filter((row) => row[2] === "3301009").reduce((sum, row) => sum + row[8], 0);

test("dashboard view switcher alternates map and analytical views", async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, "A comparação com o JSON do snapshot exige a execução externa do prod-mock.");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);

  await expect(page.getByRole("tab", { name: "Visualização: Mapa", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".map-card")).toBeVisible();
  await page.getByRole("button", { name: /^Sudeste ·/ }).click();
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();

  await page.getByRole("tab", { name: "Visualização: Indicadores", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Indicadores do recorte" })).toBeVisible();
  await expect(page.getByText("Total de notificações", { exact: true })).toBeVisible();
  await expect(page.locator(".indicator-card").filter({ hasText: "Total de notificações" }).locator("strong")).toHaveText(String(expectedTotal));
  await expect(page.locator(".map-card")).toBeHidden();

  await page.getByRole("tab", { name: "Visualização: Ranking", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ranking territorial" })).toBeVisible();
  await expect(page.locator("#dashboard-view-ranking-panel")).toBeVisible();

  await page.getByRole("tab", { name: "Visualização: Cobertura", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cobertura territorial" })).toBeVisible();
  await expect(page.locator(".coverage-values")).toContainText(`${expectedTotal} mapeadas`);

  await page.getByRole("tab", { name: "Visualização: Tabela", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tabela analítica" })).toBeVisible();
  await expect(page.locator(".analytical-table")).toBeVisible();
  await expect(page.locator(".analytical-table tbody tr").filter({ hasText: "Campos dos Goytacazes" }).locator("td").first()).toHaveText(String(expectedCampos));

  await page.getByRole("tab", { name: "Visualização: Mapa", exact: true }).click();
  await expect(page.locator(".map-card")).toBeVisible();
});

test("restores map scroll position after changing analytical view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await login(page);
  await page.evaluate(() => window.scrollTo(0, 420));
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  const before = await page.evaluate(() => window.scrollY);
  await page.getByRole("tab", { name: "Visualização: Indicadores", exact: true }).click();
  await page.getByRole("tab", { name: "Visualização: Mapa", exact: true }).click();
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBeGreaterThanOrEqual(Math.max(0, before - 2));
});

test("restores the scroll position of each analytical view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await login(page);
  await page.getByRole("tab", { name: "Visualização: Indicadores", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 260));
  const indicatorsPosition = await page.evaluate(() => window.scrollY);
  await page.getByRole("tab", { name: "Visualização: Ranking", exact: true }).click();
  await page.getByRole("tab", { name: "Visualização: Indicadores", exact: true }).click();
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(Math.max(0, indicatorsPosition - 2));
});

test("first visit to an analytical view keeps the switcher in view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await login(page);
  await page.evaluate(() => window.scrollTo(0, 420));
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await page.getByRole("tab", { name: "Visualização: Indicadores", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Indicadores do recorte" })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY <= document.documentElement.scrollHeight - window.innerHeight)).toBeTruthy();
});

test("analytical views remain discoverable and usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("tab", { name: "Visualização: Indicadores", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Indicadores do recorte" })).toBeVisible();
  await expect(page.locator(".dashboard-view-switcher")).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBeTruthy();
});
