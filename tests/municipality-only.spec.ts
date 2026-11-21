import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";

test("SIFA/2025 permanece restrita ao município e não consulta distritos", async ({ page }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Usa o servidor API local com respostas controladas.");
  let districtRequests = 0;
  await page.route("**/api/v1/diseases", route => route.fulfill({ json: { items: ["DENG", "SIFA"] } }));
  await page.route("**/api/v1/metadata", route => route.fulfill({ json: {
    availableYears: [2025, 2026],
    availableMonthsByYear: { "2025": [1], "2026": [1] },
    municipalityOnlyScopes: [{ disease: "SIFA", year: 2025 }],
  } }));
  await page.route("**/api/v1/epidemiology/region?**", route => route.fulfill({ json: {
    items: [{ code: "SE", name: "Sudeste", notificationsTotal: 7305 }],
    totalNotifications: 7305,
    coverage: { status: "AVAILABLE", mappedNotificationsTotal: 7305, unmappedNotificationsTotal: 0 },
  } }));
  await page.route("**/api/v1/epidemiology/state?**", route => route.fulfill({ json: {
    items: [{ code: "33", name: "Rio de Janeiro", notificationsTotal: 7305 }],
    totalNotifications: 7305,
    coverage: { status: "AVAILABLE", mappedNotificationsTotal: 7305, unmappedNotificationsTotal: 0 },
  } }));
  await page.route("**/api/v1/epidemiology/municipalities?**", route => route.fulfill({ json: {
    items: [{ code: "3304557", name: "Rio de Janeiro", notificationsTotal: 7305 }],
    totalNotifications: 7305,
    coverage: { status: "AVAILABLE", mappedNotificationsTotal: 7305, unmappedNotificationsTotal: 0 },
  } }));
  await page.route("**/api/v1/epidemiology/districts?**", route => {
    districtRequests += 1;
    return route.fulfill({ json: { items: [], totalNotifications: 7305, coverage: {
      status: "PARTIAL", mappedNotificationsTotal: 0, unmappedNotificationsTotal: 7305,
    } } });
  });

  await login(page, apiBaseUrl);
  const filters = page.locator("aside");
  await filters.getByLabel("Doença", { exact: true }).selectOption("SIFA");
  await filters.getByLabel("Ano", { exact: true }).selectOption("2025");
  await page.getByRole("button", { name: /^Sudeste ·/ }).click();
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).last().click();

  await expect(page.locator(".map-context")).toContainText("O SINAN não disponibiliza em qual Unidade");
  await expect(page.locator(".map-context")).toContainText("para a SIFA, apenas o município");
  await expect(page.getByRole("heading", { name: /Distritos/ })).toHaveCount(0);
  expect(districtRequests).toBe(0);
});

test("ESPORO histórica não exibe bairro ou distrito", async ({ page }) => {
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Usa o servidor API local com respostas controladas.");
  let districtRequests = 0;
  await page.route("**/api/v1/diseases", route => route.fulfill({ json: { items: ["ESPORO"] } }));
  await page.route("**/api/v1/metadata", route => route.fulfill({ json: {
    availableYears: [2025], availableMonthsByYear: { "2025": [8] }, municipalityOnlyScopes: [],
  } }));
  const response = (items: unknown[]) => ({ json: { items, totalNotifications: 258, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 258, unmappedNotificationsTotal: 0, territorialLevel: "MUNICIPALITY_ONLY" } } });
  await page.route("**/api/v1/epidemiology/region?**", route => route.fulfill(response([{ code: "SE", name: "Sudeste", notificationsTotal: 258 }])));
  await page.route("**/api/v1/epidemiology/state?**", route => route.fulfill(response([{ code: "33", name: "Rio de Janeiro", notificationsTotal: 258 }])));
  await page.route("**/api/v1/epidemiology/municipalities?**", route => route.fulfill(response([{ code: "3301009", name: "Campos dos Goytacazes", notificationsTotal: 258 }])));
  await page.route("**/api/v1/epidemiology/districts?**", route => { districtRequests += 1; return route.fulfill(response([])); });
  await login(page, apiBaseUrl);
  const filters = page.locator("aside");
  await filters.getByLabel("Doença", { exact: true }).selectOption("ESPORO");
  await filters.getByLabel("Ano", { exact: true }).selectOption("2025");
  await page.getByRole("button", { name: /^Sudeste ·/ }).click();
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();
  await page.getByRole("button", { name: /^Campos dos Goytacazes ·/ }).click();
  await expect(page.getByLabel("Distrito", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Bairro da notificação", { exact: true })).toHaveCount(0);
  await expect(page.locator(".map-context")).toContainText("granularidade municipal");
  expect(districtRequests).toBe(0);
});
