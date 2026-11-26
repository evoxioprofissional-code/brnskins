import { defineConfig, devices } from "@playwright/test";

/**
 * Os testes rodam num servidor próprio (porta 3100) com o catálogo de
 * DEMONSTRAÇÃO, para que preços e itens sejam sempre os mesmos. O site de
 * desenvolvimento (porta 3000) continua com o catálogo real do Supabase.
 */
const PORT = Number(process.env.TEST_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1648, height: 928 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { NEXT_PUBLIC_CATALOG_SOURCE: "demo", NEXT_DIST_DIR: ".next-test" },
  },
});
