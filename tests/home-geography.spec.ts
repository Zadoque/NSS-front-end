import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("institutional home, links and browser history", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "saúde do território",
  );
  await expect(page.getByText("Onde estamos", { exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("dados sintéticos");
  await page.getByRole("link", { name: "Acessar o mapa" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await page.getByRole("link", { name: "Página inicial" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Escolha o território" }),
  ).toBeVisible();
});

for (const width of [375, 1440]) {
  test(`selectors, search and breadcrumb synchronize at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("link", { name: "Acessar o mapa" }).first().click();
    await login(page);
    await expect(page.getByLabel("Estado", { exact: true })).toBeDisabled();
    await page.getByLabel("Região", { exact: true }).selectOption("SE");
    await expect(page.locator(".geo")).toHaveCount(4);
    await page.getByLabel("Estado", { exact: true }).selectOption("RJ");
    await expect(page.locator(".geo")).toHaveCount(92);
    const search = page.getByLabel("Pesquisar município");
    const municipality = page.getByLabel("Município", { exact: true });
    await search.fill("cam");
    await municipality.selectOption("3301009");
    await expect(page.getByRole("heading", { name: "Distritos de Campos dos Goytacazes" })).toBeVisible();
    await expect(page.locator(".map-context")).toContainText("120 notificações");
    await expect(page.getByRole("heading", { name: "Notificações por distrito" })).toBeVisible();
    await search.fill("maca");
    await expect(municipality.locator("option", { hasText: "Macaé" })).toHaveCount(1);
    await search.fill("macae");
    await expect(municipality).toHaveValue("3301009");
    await municipality.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(municipality).toHaveValue("3302403");
    await expect(page.locator(".map-context")).toContainText("Macaé");
    await search.fill("zzzz");
    await expect(page.locator("#municipality-help")).toContainText(
      "0 municípios encontrados",
    );
    await search.fill("");
    await municipality.selectOption({ label: "Angra dos Reis" });
    await expect(page.locator(".map-context")).toContainText(
      "Sem cobertura nesta V1",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "Sudeste", exact: true }).click();
    await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("");
    await expect(municipality).toHaveValue("");
    await expect(municipality).toBeDisabled();
    await page.getByRole("button", { name: "Brasil", exact: true }).click();
    await expect(page.getByLabel("Região", { exact: true })).toHaveValue("");
  });
}

test("map and ranking update selectors, including unavailable areas", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: /^Norte ·/ }).click();
  await expect(page.getByLabel("Região", { exact: true })).toHaveValue("N");
  await page.getByRole("button", { name: /^Sudeste ·/ }).click();
  await expect(page.getByLabel("Região", { exact: true })).toHaveValue("SE");
  await page.getByRole("button", { name: /^São Paulo ·/ }).click();
  await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("SP");
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();
  await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("RJ");
  await page.getByRole("button", { name: /^Campos dos Goytacazes ·/ }).click();
  await expect(page.getByLabel("Município", { exact: true })).toHaveValue(
    "3301009",
  );
  await page.getByLabel("Município", { exact: true }).selectOption("3302403");
  await expect(page.getByLabel("Município", { exact: true })).toHaveValue(
    "3302403",
  );
});
