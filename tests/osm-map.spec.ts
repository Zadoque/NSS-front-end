import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("renderiza bairros OSM e usa os identificadores canônicos da pipeline", async ({ page }) => {
  await page.route("**/api/v1/diseases", route => route.fulfill({ json: { items: ["DENG"] } }));
  await page.route("**/api/v1/metadata", route => route.fulfill({ json: { availableYears: [2026], availableMonthsByYear: { "2026": [1] } } }));
  await page.route("**/api/v1/epidemiology/**", route => {
    const url = new URL(route.request().url());
    const geography = url.pathname.split("/").pop();
    const municipality = url.searchParams.get("municipalityCode") ?? "3300209";
    if (geography === "region") return route.fulfill({ json: { items: [{ code: "SE", name: "Sudeste", notificationsTotal: 1 }], totalNotifications: 1, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 1, unmappedNotificationsTotal: 0 } } });
    if (geography === "state") return route.fulfill({ json: { items: [{ code: "33", name: "Rio de Janeiro", notificationsTotal: 1 }], totalNotifications: 1, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 1, unmappedNotificationsTotal: 0 } } });
    if (geography === "municipalities") return route.fulfill({ json: { items: [{ code: "3300209", name: "Araruama", notificationsTotal: 1 }], totalNotifications: 1, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 1, unmappedNotificationsTotal: 0 } } });
    if (geography === "districts") return route.fulfill({ json: { items: [{ code: `IBGE_DIST_${municipality}05`, name: "Distrito principal", notificationsTotal: 1 }], totalNotifications: 1, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 1, unmappedNotificationsTotal: 0 } } });
    return route.fulfill({ json: { items: [{ code: "OSM_BAIRRO_WAY_350238677", name: "Localidade OSM", notificationsTotal: 1, parentDistrictId: `IBGE_DIST_${municipality}05` }], totalNotifications: 1, coverage: { status: "AVAILABLE", mappedNotificationsTotal: 1, unmappedNotificationsTotal: 0 } } });
  });

  await login(page, "http://127.0.0.1:39174");
  await page.getByLabel("Região", { exact: true }).selectOption("SE");
  await page.getByLabel("Estado", { exact: true }).selectOption("33");
  await page.getByLabel("Município", { exact: true }).selectOption("3300209");
  await expect(page.getByRole("heading", { name: "Bairros da notificação", exact: true })).toBeVisible();
  await expect(page.locator(".geo")).toHaveCount(22);
  await expect(page.getByRole("button", { name: /Areal/ })).toBeVisible();
  await expect(page.locator(".geo").first()).toHaveAttribute("aria-label", /Areal/);
});
