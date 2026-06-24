import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("healthcheck responde ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.service).toBe("jsm-flow");
  });

  test("landing carga y enlaza a login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  });

  test("login muestra el formulario", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
  });

  test("rutas protegidas redirigen a login sin sesión", async ({ page }) => {
    await page.goto("/cotizaciones");
    await expect(page).toHaveURL(/\/login/);
  });

  test("portal con token inválido no expone datos", async ({ page }) => {
    const res = await page.goto("/portal/00000000-0000-0000-0000-000000000000");
    expect(res?.status()).toBe(404);
  });
});
