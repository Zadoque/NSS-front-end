import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { login } from "./helpers";

test("catálogo cartográfico mantém município e asset intramunicipal para os 92 municípios do RJ", () => {
  const root = resolve(process.cwd(), "public/maps/national");
  const index = JSON.parse(readFileSync(resolve(root, "municipalities.index.json"), "utf8")) as {
    items: Array<{ code: string; uf: string; path: string }>;
  };
  const rio = index.items.filter((item) => item.uf === "RJ");
  expect(rio).toHaveLength(92);
  for (const municipality of rio) {
    const municipalityMap = JSON.parse(readFileSync(resolve(root, municipality.path), "utf8"));
    const districts = JSON.parse(readFileSync(resolve(root, `districts/${municipality.code}.geojson`), "utf8"));
    const neighborhoods = JSON.parse(readFileSync(resolve(root, `neighborhoods/${municipality.code}.geojson`), "utf8"));
    expect(municipalityMap.type).toBe("FeatureCollection");
    expect(districts.type).toBe("FeatureCollection");
    expect(districts.features.length, municipality.code).toBeGreaterThan(0);
    expect(neighborhoods.type).toBe("FeatureCollection");
  }
});

test("catálogo CNES estático inclui o estabelecimento de Tijuca em Cachoeiro", () => {
  const catalog = JSON.parse(readFileSync(resolve(process.cwd(), "public/maps/national/health-units/3201209.json"), "utf8")) as {
    items: Array<{ c: string; n: string; b: string; d: string; x: number; y: number }>;
  };
  const unit = catalog.items.find((item) => item.c === "2548127");
  expect(unit).toEqual({
    c: "2548127",
    n: "UNIMED SUL CAPIXABA COOPERATIVA DE TRABALHO MEDICO",
    b: "TIJUCA",
    d: "IBGE_DIST_320120905",
    x: -41.083905,
    y: -20.914335,
  });
});

test("API exibe regiões, estados e municípios nacionais em sequência", async ({ page }) => {
  const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await login(page, apiBaseUrl);

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
