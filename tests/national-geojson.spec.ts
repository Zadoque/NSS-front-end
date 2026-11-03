import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("mock exibe regiões, estados e municípios nacionais em sequência", async ({ page }) => {
  await login(page);

  await page.getByRole("button", { name: /^Nordeste ·/ }).click();
  await expect(page.locator(".geo")).toHaveCount(9);
  await expect(page.getByRole("button", { name: /^Bahia ·/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^São Paulo ·/ })).toHaveCount(0);
  await page.screenshot({ path: "/tmp/nss-national-nordeste-estados.png", fullPage: true });

  await page.getByRole("button", { name: /^Bahia ·/ }).click();
  await expect(page.locator(".geo")).toHaveCount(417);
  await expect(page.getByRole("button", { name: /^Salvador ·/ })).toBeVisible();
  await page.screenshot({ path: "/tmp/nss-national-bahia-municipios.png", fullPage: true });

  await page.getByLabel("Região", { exact: true }).selectOption("SE");
  await expect(page.locator(".geo")).toHaveCount(4);
  await page.getByLabel("Estado", { exact: true }).selectOption("33");
  await expect(page.locator(".geo")).toHaveCount(92);
  await expect(page.getByRole("button", { name: /^Campos dos Goytacazes ·/ })).toBeVisible();
  await page.screenshot({ path: "/tmp/nss-national-rj-municipios.png", fullPage: true });
});
