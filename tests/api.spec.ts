import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("Java adapter uses filters, zero, empty, loading and retry without demo fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/v1/diseases", (route) =>
    route.fulfill({ json: { items: ["DENG", "TEST"] } }),
  );
  await page.route("**/api/v1/metadata", (route) =>
    route.fulfill({ json: { availableYears: [2025, 2026], availableMonthsByYear: { "2025": [1], "2026": [1] } } }),
  );
  let failing = false;
  await page.route(
    "**/api/v1/epidemiology/municipalities?**",
    async (route) => {
      if (failing) return route.fulfill({ status: 503, body: "" });
      const params = new URL(route.request().url()).searchParams;
      const filters = {
        disease: params.get("disease"),
        year: Number(params.get("year")),
        month: Number(params.get("month")),
      };
      await new Promise((resolve) => setTimeout(resolve, 350));
      const items =
        filters.disease === "DENG" &&
        filters.year === 2026 &&
        filters.month === 1
          ? [
              {
                cdUf: "33",
                nmUf: "Rio de Janeiro",
                cdMun: "3301009",
                nmMun: "Campos dos Goytacazes",
                casesTotal: 0,
              },
            ]
          : [];
      return route.fulfill({ json: { ...filters, items } });
    },
  );
  await page.route("**/api/v1/epidemiology/districts?**", async (route) => {
    if (failing) return route.fulfill({ status: 503, body: "" });
    const params = new URL(route.request().url()).searchParams;
    const isDeng = params.get("disease") === "DENG" && params.get("year") === "2026" && params.get("month") === "1";
    return route.fulfill({ json: {
      metric: "notifications",
      geography: "DISTRICT",
      filters: { disease: params.get("disease"), year: Number(params.get("year")), month: Number(params.get("month")) },
      totalNotifications: isDeng ? 0 : null,
      coverage: { status: isDeng ? "AVAILABLE" : "UNAVAILABLE", mappedNotificationsTotal: 0, unmappedNotificationsTotal: 0 },
      items: isDeng ? [{ code: "CG_DIST_SEDE", name: "Distrito Sede", notificationsTotal: 0, parentDistrictId: null }] : [],
    } });
  });
  await login(page, "http://127.0.0.1:5174");
  await expect(page.locator(".badge")).toHaveCount(0);
  await page.getByRole("button", { name: /^Sudeste ·/ }).click();
  await page.getByRole("button", { name: /^Rio de Janeiro ·/ }).click();
  await page.getByRole("button", { name: /^Campos dos Goytacazes ·/ }).click();
  await expect(page.locator(".map-context")).toContainText("0 notificações");
  await expect(page.getByRole("heading", { name: "Distritos de Campos dos Goytacazes" })).toBeVisible();
  await page
    .locator("aside")
    .getByLabel("Doença", { exact: true })
    .selectOption("TEST");
  await expect(page.locator(".map-context")).toContainText("Carregando");
  await expect(page.locator(".map-context")).toContainText("Sem registros");
  failing = true;
  await page
    .locator("aside")
    .getByLabel("Ano", { exact: true })
    .selectOption("2025");
  await expect(page.locator(".query-state")).toContainText(
    "Não foi possível carregar os dados",
  );
  await expect(page.locator(".ranking")).toHaveCount(0);
  failing = false;
  await page
    .locator(".query-state")
    .getByRole("button", { name: "Tentar novamente" })
    .click();
  await expect(page.locator(".query-state")).toContainText("Sem registros");
});
