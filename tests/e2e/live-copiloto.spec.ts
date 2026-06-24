import { test, expect } from "@playwright/test";

// Prueba EN VIVO del copiloto (requiere OPENAI_API_KEY real). Correr a propósito:
//   npx playwright test live-copiloto --workers=1
test.describe("Copiloto en vivo", () => {
  // Consume tokens reales. Correr a propósito: RUN_LIVE=1 npx playwright test live-copiloto
  test.skip(!process.env.RUN_LIVE, "Define RUN_LIVE=1 (requiere OPENAI_API_KEY)");
  test.setTimeout(90_000);

  async function login(page: import("@playwright/test").Page) {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Correo").fill("admin@jsm.test");
    await page.getByLabel("Contraseña").fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole("button", { name: /copiloto/i }).click();
    await expect(page.getByText("Copiloto JSM")).toBeVisible();
  }

  test("lectura: responde sobre cobranza con datos reales", async ({ page }) => {
    await login(page);
    await page.getByPlaceholder("Escribe un mensaje…").fill("¿Cuánto tengo por cobrar en total?");
    await page.getByRole("button", { name: "Enviar" }).click();

    // Respuesta real del modelo con cifra (no el eco del usuario ni el aviso de clave)
    await expect(page.getByText(/\$\s?0|\$0\.00|monto/i).last()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/OPENAI_API_KEY/)).toHaveCount(0);
  });

  test("escritura: crea cliente con aprobación HITL", async ({ page }) => {
    await login(page);
    await page
      .getByPlaceholder("Escribe un mensaje…")
      .fill("Crea un cliente llamado Copiloto QA SA con correo qa@copiloto.mx");
    await page.getByRole("button", { name: "Enviar" }).click();

    // Debe pedir aprobación y mostrar la acción concreta
    await expect(page.getByText("Requiere tu aprobación")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Crear cliente/i)).toBeVisible();
    await page.getByRole("button", { name: "Aprobar" }).click();

    // Confirmación de creación (frase del asistente, no el eco del usuario)
    await expect(page.getByText(/exitosamente|ha sido creado|creado/i).last()).toBeVisible({
      timeout: 60_000,
    });
  });
});
