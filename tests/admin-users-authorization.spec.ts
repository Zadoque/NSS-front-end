import { test, expect } from "@playwright/test";

test("exibe papéis e grants atuais na gestão administrativa", async ({ page }) => {
  const base = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:39174";
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ json: {
    accessToken: "test-token",
    tokenType: "Bearer",
    expiresIn: 900,
    user: { id: 1, email: "admin@nss.test", name: "Admin" },
    permissions: ["USER_MANAGEMENT"],
  } }));
  await page.route("**/api/v1/admin/users/invitations", route => route.fulfill({ json: [] }));
  await page.route("**/api/v1/admin/users*", route => route.fulfill({ json: {
    items: [{ id: 2, email: "user@nss.test", name: "Usuário", active: true,
      roles: ["REPRESENTANTE_MUNICIPAL"], permissions: ["map.human.view"],
      grants: [{ permission: "map.human.view", scopeType: "CLINIC", clinicId: "11111111-1111-1111-1111-111111111111" }] }],
    page: 0, size: 60, hasNext: false, totalItems: 1,
  } }));

  await page.goto(`${base}/admin/usuarios`);
  await expect(page.getByText(/Papéis: REPRESENTANTE_MUNICIPAL/)).toBeVisible();
  await expect(page.getByText(/Grants: map\.human\.view/)).toBeVisible();
  await expect(page.getByText(/CLINIC:11111111-1111-1111-1111-111111111111/)).toBeVisible();
  await page.getByRole("button", { name: "Papéis e grants" }).click();
  await expect(page.getByLabel("Motivo auditável")).toBeVisible();
  await expect(page.getByRole("button", { name: /Conceder papel a user@nss\.test/ })).toBeVisible();
});
