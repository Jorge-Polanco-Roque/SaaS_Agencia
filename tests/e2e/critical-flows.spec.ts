import { test, expect, type Page } from "@playwright/test";

/**
 * Flujos críticos. Requieren Supabase con el seed (usuarios password123) y la
 * app corriendo. Si no hay entorno, omitir con E2E_SKIP_FLOWS=1.
 */
const SKIP = process.env.E2E_SKIP_FLOWS === "1";

async function login(page: Page, email: string) {
  await page.context().clearCookies(); // cierra cualquier sesión previa
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("Flujos críticos", () => {
  test.skip(SKIP, "Sin entorno Supabase/seed");

  test("Cotización: ejecutivo crea, admin valida y envía", async ({ page }) => {
    await login(page, "ejecutivo@jsm.test");
    await page.goto("/cotizaciones/nueva");

    await page.getByLabel("Cliente *").selectOption({ index: 1 });
    await page.getByLabel("Título *").fill("E2E Promocionales");
    // primera partida
    await page.getByLabel("Descripción").first().fill("Termo personalizado");
    await page.getByRole("button", { name: "Crear cotización" }).click();
    await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]+/);

    const url = page.url();

    // enviar a validación y esperar a que el estado cambie
    await page.getByRole("button", { name: "Enviar a validación" }).click();
    await expect(page.getByText("En validación")).toBeVisible();

    // admin valida y envía
    await login(page, "admin@jsm.test");
    await page.goto(url);
    await page.getByRole("button", { name: /Validar/ }).click();
    await expect(page.getByText(/COT-\d/)).toBeVisible();
    await page.getByRole("button", { name: "Enviar al cliente" }).click();
    await expect(page.getByText("Portal del cliente:")).toBeVisible();
  });

  test("Compras: admin crea OC, autoriza y registra pago", async ({ page }) => {
    await login(page, "admin@jsm.test");
    await page.goto("/compras/nueva");
    await page.getByLabel("Proveedor *").selectOption({ index: 1 });
    await page.getByLabel("Descripción").first().fill("Insumos evento");
    await page.getByLabel("Costo unit.").first().fill("1000");
    await page.getByRole("button", { name: "Crear orden de compra" }).click();
    await expect(page).toHaveURL(/\/compras\/[0-9a-f-]+/);

    await page.getByRole("button", { name: "Enviar a autorización" }).click();
    await page.getByRole("button", { name: /Autorizar/ }).click();
    await expect(page.getByText(/OC-/)).toBeVisible();

    await page.getByLabel("Monto *").fill("500");
    await page.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByText("Pagos (1)")).toBeVisible();
  });

  test("Ciclo completo: cotización → portal → proyecto", async ({ page }) => {
    const titulo = `Ciclo E2E ${Date.now()}`;

    // Ejecutivo crea
    await login(page, "ejecutivo@jsm.test");
    await page.goto("/cotizaciones/nueva");
    await page.getByLabel("Cliente *").selectOption({ index: 1 });
    await page.getByLabel("Título *").fill(titulo);
    await page.getByLabel("Descripción").first().fill("Servicio integral");
    await page.getByRole("button", { name: "Crear cotización" }).click();
    await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]+/);
    await page.getByRole("button", { name: "Enviar a validación" }).click();
    await expect(page.getByText("En validación")).toBeVisible();
    const url = page.url();

    // Admin valida y envía
    await login(page, "admin@jsm.test");
    await page.goto(url);
    await page.getByRole("button", { name: /Validar/ }).click();
    await page.getByRole("button", { name: "Enviar al cliente" }).click();
    const codeText = await page
      .locator("code", { hasText: "/portal/" })
      .innerText();
    const token = codeText.trim().split("/portal/")[1];
    expect(token).toMatch(/[0-9a-f-]{36}/);

    // Cliente confirma desde el portal (sin sesión)
    await page.context().clearCookies();
    await page.goto(`/portal/${token}`);
    await expect(page.getByText(titulo)).toBeVisible();
    await page.getByRole("button", { name: "Confirmar cotización" }).click();
    await expect(page.getByText(/confirmada/i).first()).toBeVisible();

    // El proyecto se creó automáticamente
    await login(page, "admin@jsm.test");
    await page.goto("/proyectos");
    await expect(page.getByText(titulo).first()).toBeVisible();
  });

  test("Finanzas: solicitud de pago, autorización y cobranza", async ({ page }) => {
    await login(page, "admin@jsm.test");
    await page.goto("/finanzas");

    // Crear solicitud de pago (form que "no funcionaba" — Fase 8 lo verifica)
    const concepto = `Anticipo proveedor E2E ${Date.now()}`;
    await page.getByLabel("Concepto *").fill(concepto);
    await page.getByLabel("Monto *").first().fill("1500");
    await page.getByRole("button", { name: "Crear solicitud" }).click();
    await expect(page.getByText(concepto).first()).toBeVisible();

    // Autorizar la solicitud recién creada (ciclo completo del form)
    await page
      .getByRole("row", { name: new RegExp(concepto) })
      .getByRole("button", { name: "Autorizar" })
      .click();
    await expect(page.getByText(/autorizada/i).first()).toBeVisible();

    // Ejecutar recordatorios de cobranza (degrada a simulado sin credenciales)
    await page.getByRole("button", { name: /recordatorios de cobranza/i }).click();
    await expect(page.getByText(/vencidas/)).toBeVisible();
  });

  test("Compras (Fase 8): programar dispersión Tiempo × días", async ({ page }) => {
    await login(page, "admin@jsm.test");
    await page.goto("/compras/nueva");
    await page.getByLabel("Proveedor *").selectOption({ index: 1 });
    await page.getByLabel("Descripción").first().fill("Insumos dispersión E2E");
    await page.getByLabel("Costo unit.").first().fill("3000");
    await page.getByRole("button", { name: "Crear orden de compra" }).click();
    await expect(page).toHaveURL(/\/compras\/[0-9a-f-]+/);

    // Programar la dispersión en 3 parcialidades → genera solicitudes de pago
    await expect(page.getByText("Dispersión (Tiempo × días)")).toBeVisible();
    await page.getByLabel("Parcialidades").fill("3");
    await page.getByRole("button", { name: "Programar dispersión" }).click();
    await expect(
      page.getByText(/Dispersión programada como solicitudes de pago/i)
    ).toBeVisible();
  });

  test("Cotización (Fase 8): partida de personal rol × personas × días", async ({
    page,
  }) => {
    await login(page, "ejecutivo@jsm.test");
    await page.goto("/cotizaciones/nueva");
    await page.getByLabel("Cliente *").selectOption({ index: 1 });
    await page.getByLabel("Título *").fill(`Promotoría E2E ${Date.now()}`);

    // Cambia la partida a modalidad personal y captura rol/personas/días
    await page.getByLabel("Modalidad").first().selectOption("personal");
    await page.getByLabel("Rol").first().fill("Promotor");
    await page.getByLabel("Días").first().fill("10");
    await page.getByLabel("Descripción").first().fill("Promotor en piso");
    await page.getByLabel("Personas").first().fill("2");
    await page.getByLabel("Precio unit.").first().fill("1100");

    // 2 personas × 10 días × 1100 = 22,000
    await expect(page.getByText(/22,000/)).toBeVisible();
    await page.getByRole("button", { name: "Crear cotización" }).click();
    await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]+/);
  });
});
