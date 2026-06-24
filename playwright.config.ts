import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de los flujos críticos. Requiere la app y Supabase corriendo con seed.
 *   npx supabase start && npx supabase db reset
 *   npm run build && npm start   (o npm run dev)
 *   npx playwright install        (una vez, descarga navegadores)
 *   npm run test:e2e
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  // El dev server compila rutas on-demand; demasiados workers en frío lo saturan.
  workers: process.env.CI ? 1 : 2,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
