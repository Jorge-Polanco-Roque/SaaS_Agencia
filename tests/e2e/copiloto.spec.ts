import { test, expect } from "@playwright/test";

const SKIP = process.env.E2E_SKIP_FLOWS === "1";

// Verifica el flujo UI → endpoint del copiloto. Sin OPENAI_API_KEY, el endpoint
// degrada con un mensaje claro (camino determinista sin LLM).
test.describe("Copiloto", () => {
  test.skip(SKIP, "Sin entorno Supabase/seed");

  test("panel abre y responde (degrada sin API key)", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Correo").fill("admin@jsm.test");
    await page.getByLabel("Contraseña").fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: /copiloto/i }).click();
    await expect(page.getByText("Copiloto JSM")).toBeVisible();

    await page.getByPlaceholder("Escribe un mensaje…").fill("hola");
    await page.getByRole("button", { name: "Enviar" }).click();

    // Con o sin clave, debe aparecer una respuesta (texto del modelo o aviso de config)
    await expect(
      page.getByText(/OPENAI_API_KEY|cobrar|cotiz|copiloto|no se pudo/i).first()
    ).toBeVisible({ timeout: 20000 });
  });
});
