import fs from "node:fs";
import { expect, test } from "@playwright/test";

// O servidor lê a chave do .env.local; o processo do Playwright não carrega esse arquivo.
const hasKey =
  Boolean(process.env.NEXT_PUBLIC_CS2INSPECT_KEY) ||
  (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split("\n")
    .some((l) => /^NEXT_PUBLIC_CS2INSPECT_KEY=.+/.test(l.trim()));

test("botão Inspecionar 3D envia a skin selecionada para /inspect", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver detalhes de AWP | Fade" }).first().click();
  const link = page.getByRole("dialog", { name: /AWP \| Fade/ }).getByRole("link", { name: "Inspecionar 3D" });
  await expect(link).toHaveAttribute("href", /\/inspect\?skin=demo-awp-fade&wear=0\.007421/);
  await link.click();
  await expect(page).toHaveURL(/\/inspect\?skin=demo-awp-fade/);
  await expect(page.getByRole("searchbox").or(page.getByLabel("Buscar skin para inspecionar"))).toHaveAttribute("placeholder", "AWP | Fade");
});

test("estúdio mostra o crédito do CS2Inspect e o estado da chave", async ({ page }) => {
  await page.goto("/inspect");
  await expect(page.getByRole("link", { name: "cs2inspect.skin" })).toBeVisible();
  if (!hasKey) await expect(page.getByText("Configure a chave do CS2Inspect")).toBeVisible();
});

test("busca troca a skin do estúdio", async ({ page }) => {
  await page.goto("/inspect");
  await page.getByLabel("Buscar skin para inspecionar").fill("bayonet");
  await page.getByRole("button", { name: /Bayonet \| Fade/ }).click();
  await expect(page.getByLabel("Buscar skin para inspecionar")).toHaveAttribute("placeholder", "★ Bayonet | Fade");
});
