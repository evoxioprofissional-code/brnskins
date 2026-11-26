import fs from "node:fs";
import { expect, test } from "@playwright/test";

/** Cotador do admin: busca, colar lista, modo upgrade e cotação pronta para o WhatsApp. */
const env = Object.fromEntries(
  (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
test.skip(!env.ADMIN_PASSWORD || !env.SUPABASE_SERVICE_ROLE_KEY, "Admin ou Supabase não configurados");
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("cotador: busca, colar lista, upgrade e copiar cotação", async ({ page, isMobile }) => {
  test.skip(isMobile, "Tela de trabalho do admin (desktop)");
  await page.goto("/admin/login");
  await page.getByLabel("Senha").fill(env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/admin$/);
  await page.goto("/admin/cotador");
  await page.evaluate(() => localStorage.removeItem("brn-cotador-v1"));
  await page.reload();

  await page.getByLabel(/Buscar skin pelo nome/).fill("karambit tiger tooth fn");
  await page.getByRole("button", { name: /Karambit \| Tiger Tooth \(Factory New\)/ }).first().click();
  await expect(page.getByText("★ Karambit | Tiger Tooth (Factory New)").first()).toBeVisible();

  await page.getByLabel("Modo upgrade").check();
  const client = page.locator("section", { hasText: "Itens do cliente" });
  await client.getByRole("button", { name: "Colar lista" }).click();
  await client.getByLabel("Colar lista de skins").fill("AK Redline FT\nskin inexistente xyz");
  await client.getByRole("button", { name: "Adicionar" }).click();
  await expect(client.getByText("AK-47 | Redline (Field-Tested)")).toBeVisible({ timeout: 15_000 });
  await expect(client.getByText(/Não encontrei: skin inexistente xyz/)).toBeVisible();

  await page.getByRole("button", { name: "Copiar cotação" }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("★ Karambit | Tiger Tooth (Factory New)");
  expect(text).toContain("AK-47 | Redline (Field-Tested)");
  expect(text).toMatch(/Você (paga|recebe) \(PIX\): R\$/);
});
