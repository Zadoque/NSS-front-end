import { expect, type Page } from "@playwright/test";

export async function login(page: Page, baseUrl = "") {
  await page.goto(`${baseUrl}/login`);
  await expect(page.getByRole("heading", { name: "Entrar no NSS" })).toBeVisible();
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.getByRole("heading", { name: "Um olhar sobre o território" })).toBeVisible();
}
