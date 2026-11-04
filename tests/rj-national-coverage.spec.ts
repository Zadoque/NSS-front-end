import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("RJ: 92 municípios, distritos e bairros permanecem navegáveis", async ({ page }) => {
  const rjMap = await page.request.get("/maps/rj-municipalities.geojson");
  const rj = (await rjMap.json()) as { features: { properties: { code_muni: string; name_muni: string } }[] };
  const municipalities = rj.features.map(({ properties }) => ({ code: String(properties.code_muni), name: String(properties.name_muni) }));
  expect(municipalities).toHaveLength(92);

  await page.route("**/api/v1/diseases", route => route.fulfill({ json: { items: ["DENG"] } }));
  await page.route("**/api/v1/metadata", route => route.fulfill({ json: { availableYears: [2026], availableMonthsByYear: { "2026": [1] } } }));
  await page.route("**/api/v1/epidemiology/**", route => {
    const url = new URL(route.request().url());
    const geography = url.pathname.split("/").pop();
    const municipality = url.searchParams.get("municipalityCode");
    if (geography === "region") {
      return route.fulfill({ json: { items: ["N", "NE", "CO", "SE", "S"].map((code, i) => ({ code, name: code, notificationsTotal: i + 1 })), totalNotifications: 15, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 15, unmappedNotificationsTotal: 0 } } });
    }
    if (geography === "state") {
      return route.fulfill({ json: { items: ["31", "32", "33", "35"].map((code, i) => ({ code, name: code, notificationsTotal: i + 1 })), totalNotifications: 10, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 10, unmappedNotificationsTotal: 0 } } });
    }
    if (geography === "municipalities") {
      return route.fulfill({ json: { items: municipalities.map((item, i) => ({ ...item, notificationsTotal: i + 1 })), totalNotifications: 4278, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 4278, unmappedNotificationsTotal: 0 } } });
    }
    if (geography === "districts") {
      return route.fulfill({ json: { items: [{ code: `IBGE_DIST_${municipality}05`, name: "Distrito principal", notificationsTotal: 4 }], totalNotifications: 4, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 4, unmappedNotificationsTotal: 0 } } });
    }
    return route.fulfill({ json: { items: [{ code: `IBGE_BAIRRO_${municipality}0001`, name: "Bairro principal", notificationsTotal: 4 }], totalNotifications: 4, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 4, unmappedNotificationsTotal: 0 } } });
  });

  await login(page, "http://127.0.0.1:39174");
  await page.getByLabel("Região", { exact: true }).selectOption("N");
  await expect(page.getByLabel("Estado", { exact: true }).locator("option")).toHaveCount(8);
  await page.getByLabel("Região", { exact: true }).selectOption("SE");
  await expect(page.getByLabel("Estado", { exact: true }).locator("option")).toHaveCount(5);
  await page.getByLabel("Estado", { exact: true }).selectOption("33");
  await expect(page.locator(".ranking:visible")).toContainText("92 MUNICÍPIOS");
  await expect(page.locator(".ranking:visible li")).toHaveCount(92);

  for (const item of municipalities) {
    const asset = await page.request.get(`/maps/national/neighborhoods/${item.code}.geojson`);
    expect(asset.ok(), `GeoJSON ausente para ${item.code}`).toBeTruthy();
  }

  await page.getByLabel("Município", { exact: true }).selectOption({ label: municipalities[0].name });
  await expect(page.getByLabel("Distrito", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Distrito", { exact: true }).locator("option")).toHaveCount(2);
  await page.getByLabel("Distrito", { exact: true }).selectOption({ index: 1 });
  await expect(page.getByLabel("Bairro da notificação", { exact: true })).toBeVisible();
  expect(await page.getByLabel("Bairro da notificação", { exact: true }).locator("option").count()).toBeGreaterThan(1);
});
