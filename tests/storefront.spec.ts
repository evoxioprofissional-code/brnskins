import { expect, test, type Page } from "@playwright/test";

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
};

test("drawer inicia fechado e abre ao clicar na skin", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Ver detalhes de AWP | Fade" }).first().click();
  const drawer = page.getByRole("dialog", { name: /AWP \| Fade/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("R$ 2.521,95").first()).toBeVisible();
  await drawer.getByRole("radio", { name: /MW/ }).click();
  await expect(drawer.getByText("Minimal Wear")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("filtros por categoria e busca", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: /^Filtros/ }).click();
    await page.getByRole("dialog", { name: "Filtros" }).getByRole("button", { name: /^Faca/ }).click();
    await page.getByRole("button", { name: /Ver \d+ resultado/ }).click();
  } else {
    await page.getByRole("complementary", { name: "Filtros" }).getByRole("button", { name: /^Faca/ }).click();
  }
  await expect(page.getByRole("button", { name: /Ver detalhes de ★ Bayonet \| Fade/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver detalhes de AWP | Fade" })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Buscar no catálogo" }).fill("karambit");
  await expect(page.getByRole("button", { name: /Ver detalhes de ★ Karambit/ })).toHaveCount(2);
});

test("carrinho: adicionar, alterar quantidade, persistir e remover", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver detalhes de AWP | Fade" }).first().click();
  const drawer = page.getByRole("dialog", { name: /AWP \| Fade/ });
  await drawer.getByRole("button", { name: "Aumentar quantidade" }).click();
  await drawer.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByRole("link", { name: "Carrinho (2 itens)" }).first()).toBeAttached();

  await page.goto("/carrinho");
  await expect(page.getByText("AWP | Fade")).toBeVisible();
  await expect(page.getByText("R$ 5.043,90").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("AWP | Fade")).toBeVisible();
  await page.getByRole("button", { name: "Remover AWP | Fade" }).click();
  await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
});

test("kits: adicionar conjunto ao carrinho", async ({ page }) => {
  await page.goto("/kits");
  await page.getByRole("button", { name: "Adicionar kit ao carrinho" }).first().click();
  await page.goto("/carrinho");
  await expect(page.getByText("Kit Red Line")).toBeVisible();
});

test("admin exige login", async ({ page }) => {
  await page.goto("/admin/pedidos");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Senha").fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Senha incorreta")).toBeVisible();
});

test("sem overflow horizontal", async ({ page }) => {
  for (const path of ["/", "/kits", "/carrinho", "/como-funciona", "/faq"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
