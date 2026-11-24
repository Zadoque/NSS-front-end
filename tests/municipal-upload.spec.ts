import { test, expect } from "@playwright/test";

test("representante municipal envia arquivo somente após declarar a origem", async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, "Requer frontend em modo real para validar permissões da sessão municipal.");
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } }));
  await page.route("**/api/v1/auth/login", route => route.fulfill({ json: {
    accessToken: "municipal-token",
    expiresIn: 3600,
    user: { id: 7, email: "municipal@nss.test", name: "Representante municipal" },
    permissions: ["MUNICIPAL_UPLOAD"],
  } }));
  await page.route("**/api/v1/auth/logout", route => route.fulfill({ status: 204, body: "" }));
  await page.route("**/api/v1/municipal/uploads?**", route => route.fulfill({ json: { items: [], page: 0, size: 20, totalElements: 0 } }));
  await page.route("**/api/v1/metadata", route => route.fulfill({ json: { availableYears: [2026], availableMonthsByYear: { "2026": [1] }, municipalityOnlyScopes: [], publicationFingerprint: "municipal-upload-test" } }));
  await page.route("**/api/v1/diseases", route => route.fulfill({ json: { items: ["DENG"] } }));
  await page.route("**/api/v1/epidemiology/**", route => route.fulfill({ json: { items: [], year: 2026, month: 1, totalNotifications: 0 } }));
  await page.route("**/api/v1/auth/csrf", route => route.fulfill({ body: "masked-csrf", headers: { "Set-Cookie": "XSRF-TOKEN=csrf-test; Path=/; SameSite=Strict" } }));
  await page.route("**/api/v1/municipal/uploads", async route => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
    expect(route.request().headers()["x-xsrf-token"]).toBe("csrf-test");
    await route.fulfill({ status: 201, json: { id: "upload-1", status: "VALIDATING" } });
  });

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("municipal@nss.test");
  await page.getByLabel("Senha", { exact: true }).fill("NSS-DEMO-2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/mapa$/);
  await page.getByRole("button", { name: "Envios municipais" }).click();
  await expect(page).toHaveURL(/\/uploads-municipais$/);

  await page.getByLabel("Município (IBGE)").fill("3301009");
  await page.getByLabel("Competência").fill("2026-11");
  await page.getByLabel("Arquivo CSV/XLS/XLSX").setInputFiles({ name: "esporo.csv", mimeType: "text/csv", buffer: Buffer.from("municipio,casos\n3301009,1") });
  await expect(page.getByRole("button", { name: "Enviar para validação" })).toBeDisabled();
  await page.getByLabel(/Declaro a origem municipal/).check();
  await page.getByRole("button", { name: "Enviar para validação" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Arquivo recebido para validação" })).toBeVisible();
});
