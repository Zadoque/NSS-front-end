import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home pública não tem violações WCAG automatizadas", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("login mantém foco de teclado e estados acessíveis", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("E-mail", { exact: true })).toBeFocused();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("navegação pública pode ser operada por teclado", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("link", { name: "Entrar" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("home mantém conteúdo utilizável em zoom de 200%", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});
