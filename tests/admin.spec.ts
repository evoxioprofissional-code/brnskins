import fs from "node:fs";
import { expect, test } from "@playwright/test";

const password = (() => {
  const line = (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split(/\r?\n/)
    .find((l) => l.startsWith("ADMIN_PASSWORD="));
  return line?.slice("ADMIN_PASSWORD=".length) ?? "";
})();

test.skip(!password, "ADMIN_PASSWORD não configurado em .env.local");

test.beforeEach(async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/admin$/);
});

test("dashboard exibe os painéis principais sem OpenAI", async ({ page }) => {
  for (const title of ["Precisa de atenção", "Mercado hoje", "Estoque", "Top clientes"]) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByText(/OpenAI|GPT|Assistente IA/i)).toHaveCount(0);
});

test("registrar compra adiciona unidades ao estoque", async ({ page }) => {
  await page.goto("/admin/estoque");
  const units = page.getByText("Unidades em estoque").locator("xpath=../..").locator("p").nth(1);
  const before = Number((await units.textContent())!.replace(/\D/g, ""));
  await page.getByRole("button", { name: "Registrar compra" }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar compra de skins" });
  await dialog.getByLabel("Quantidade").fill("5");
  await dialog.getByLabel(/Custo unitário/).fill("100");
  await dialog.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(units).toHaveText(new Intl.NumberFormat("pt-BR").format(before + 5));
});

test("nova sub-loja fica aguardando pagamento e é liberada ao confirmar", async ({ page }) => {
  await page.goto("/admin/sub-lojas");
  await page.getByRole("button", { name: "Nova Sub-Loja" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova sub-loja" });
  await dialog.getByLabel("Nome da loja").fill("Loja Teste E2E");
  await dialog.getByLabel("Revendedor").fill("Fulano Teste");
  await dialog.getByLabel("WhatsApp").fill("5511912345678");
  await dialog.getByRole("button", { name: "Criar sub-loja" }).click();
  const row = page.getByRole("row", { name: /Loja Teste E2E/ });
  await expect(row.getByText("Aguardando pagamento")).toBeVisible();
  await row.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(row.getByText("Ativa")).toBeVisible();
});

test("paleta de comandos (Ctrl+K) abre telas e o dashboard troca o gráfico", async ({ page, isMobile }) => {
  test.skip(isMobile, "Atalho de teclado (desktop)");
  // Clicar num indicador muda o gráfico principal
  await page.getByRole("button", { name: /Lucro líquido/ }).first().click();
  await expect(page.getByText("Lucro líquido · últimos 30 dias")).toBeVisible();

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Paleta de comandos" });
  await expect(palette).toBeVisible();
  await palette.getByLabel("Buscar comando").fill("cotador");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/admin\/cotador/);
  await expect(page.getByRole("heading", { name: "Cotador" })).toBeVisible();
});
