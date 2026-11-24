import { expect, test } from "@playwright/test";

test("upgrade lab: monta oferta, escolhe alvo e envia ao WhatsApp", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.addInitScript(() => {
    // Número fictício só para o teste e captura do link gerado (nada é aberto).
    if (!localStorage.getItem("brn-settings"))
      localStorage.setItem("brn-settings", JSON.stringify({ state: { whatsapp: { phone: "5511900000000" } }, version: 1 }));
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url: string) => {
      (window as unknown as { __opened: string[] }).__opened.push(url);
      return null;
    }) as typeof window.open;
  });

  await page.goto("/");
  await page.getByRole("tab", { name: /Upgrades/ }).click();
  await expect(page.getByRole("heading", { name: /Troque para/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Solicitar upgrade" })).toBeDisabled();

  // Oferta
  await page.getByRole("button", { name: "Adicionar skin" }).click();
  const offerPicker = page.getByRole("dialog", { name: /vai entregar/ });
  await offerPicker.getByPlaceholder(/Buscar arma/).fill("redline");
  await offerPicker.getByRole("button", { name: /AK-47 \| Redline/ }).click();
  await offerPicker.getByRole("button", { name: "Adicionar à oferta" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("1/6")).toBeVisible();

  // Item fora do catálogo
  await page.getByRole("button", { name: "Adicionar skin" }).click();
  await page.getByRole("button", { name: "Minha skin não está na lista" }).click();
  await page.getByPlaceholder(/Howl/).fill("Glock-18 | Fade (FN)");
  await page.getByRole("button", { name: "Adicionar para avaliação" }).click();
  await expect(page.getByText("A avaliar")).toBeVisible();

  // Alvo
  await page.getByRole("button", { name: /Escolha seu alvo/ }).click();
  const targetPicker = page.getByRole("dialog", { name: /quer receber/ });
  await targetPicker.getByPlaceholder(/Buscar arma/).fill("neo-noir");
  await targetPicker.getByRole("button", { name: /M4A4 \| Neo-Noir/ }).click();
  await targetPicker.getByRole("button", { name: "Definir como alvo" }).click();
  await expect(page.getByText(/% coberto|Cobertura total/)).toBeVisible();
  await expect(page.getByText("Multiplicador", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Solicitar upgrade" }).click();
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened).toHaveLength(1);
  const message = decodeURIComponent(opened[0]!.split("text=")[1]!);
  expect(message).toContain("AK-47 | Redline");
  expect(message).toContain("Glock-18 | Fade (FN) — a avaliar");
  expect(message).toContain("M4A4 | Neo-Noir");
  expect(message).toMatch(/Diferença estimada a pagar|Crédito estimado/);

  // Persistência e limpeza
  await page.reload();
  await page.getByRole("tab", { name: /Upgrades/ }).click();
  await expect(page.getByText("2/6")).toBeVisible();
  await page.getByRole("button", { name: "Limpar" }).click();
  await expect(page.getByText("0/6")).toBeVisible();
  expect(errors).toEqual([]);
});
