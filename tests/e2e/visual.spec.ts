import { test, expect } from "@playwright/test";

const SKIP = process.env.E2E_SKIP_FLOWS === "1";

// Captura del dashboard para verificación visual (no es aserción estricta).
test.describe("Visual", () => {
  test.skip(SKIP, "Sin entorno Supabase/seed");

  test("dashboard renderiza gráficas", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Correo").fill("admin@jsm.test");
    await page.getByLabel("Contraseña").fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Espera a que aparezca la cinta firma y un total
    await expect(page.getByText("Flujo JSM")).toBeVisible();
    await expect(page.getByText("Ingresos confirmados")).toBeVisible();
    await page.waitForTimeout(1200); // deja correr animaciones
    await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  });
});
