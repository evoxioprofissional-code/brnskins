import { expect, test } from "@playwright/test";

// Conta e inventário fictícios: a resposta da rota /api/steam/inventory é simulada.
const TRADE_LINK = "https://steamcommunity.com/tradeoffer/new/?partner=1&token=AbCd1234";
const STEAM_ID = "76561197960265729"; // partner 1 + base do SteamID64

const INVENTORY = {
  ok: true,
  items: [
    {
      assetId: "1001",
      marketHashName: "AK-47 | Redline (Field-Tested)",
      name: "AK-47 | Redline",
      image: "/images/skins/ak-47-redline.png",
      tradable: true,
      type: "Classified Rifle",
      exterior: "Field-Tested",
      rarityColor: "#d32ce6",
    },
    {
      assetId: "1002",
      marketHashName: "Sawed-Off | The Kraken (Minimal Wear)",
      name: "Sawed-Off | The Kraken",
      image: "/images/skins/ak-47-redline.png",
      tradable: true,
      type: "Restricted Pistol",
      exterior: "Minimal Wear",
      rarityColor: "#8847ff",
    },
    {
      assetId: "1003",
      marketHashName: "AWP | Atheris (Field-Tested)",
      name: "AWP | Atheris",
      image: "/images/skins/ak-47-redline.png",
      tradable: false,
      type: "Restricted Sniper Rifle",
      exterior: "Field-Tested",
      rarityColor: "#8847ff",
    },
  ],
};

test("upgrade: carrega o inventário Steam pelo trade link e envia o pedido", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  let requestedId = "";
  await page.route("**/api/steam/inventory?**", async (route) => {
    requestedId = new URL(route.request().url()).searchParams.get("steamid") ?? "";
    await route.fulfill({ json: INVENTORY });
  });
  await page.addInitScript(() => {
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
  await expect(page.getByRole("heading", { name: "UPGRADE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Solicitar upgrade" })).toBeDisabled();

  // Conectar pelo trade link
  await page.getByRole("button", { name: "Escolher do inventário Steam" }).click();
  const dialog = page.getByRole("dialog", { name: "Seu inventário Steam" });
  await dialog.getByPlaceholder(/tradeoffer/).fill("https://steamcommunity.com/id/alguem");
  await dialog.getByRole("button", { name: "Carregar meu inventário" }).click();
  await expect(dialog.getByText(/Links personalizados/)).toBeVisible();
  await dialog.getByPlaceholder(/tradeoffer/).fill(TRADE_LINK);
  await dialog.getByRole("button", { name: "Carregar meu inventário" }).click();

  // Inventário: item com estimativa, item a avaliar e item bloqueado
  await expect(dialog.getByRole("button", { name: /AK-47 \| Redline/ })).toBeVisible();
  expect(requestedId).toBe(STEAM_ID);
  await expect(dialog.getByRole("button", { name: /AWP \| Atheris/ })).toBeDisabled();
  await dialog.getByRole("button", { name: /AK-47 \| Redline/ }).click();
  await dialog.getByRole("button", { name: /The Kraken/ }).click();
  await expect(dialog.getByText("2/6")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar oferta" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("+ 1 a avaliar")).toBeVisible();

  // Alvo do catálogo
  await page.getByRole("button", { name: "Escolher a skin que você quer" }).click();
  const targetPicker = page.getByRole("dialog", { name: /quer receber/ });
  await targetPicker.getByPlaceholder(/Buscar arma/).fill("neo-noir");
  await targetPicker.getByRole("button", { name: /M4A4 \| Neo-Noir/ }).click();
  await targetPicker.getByRole("button", { name: "Definir como alvo" }).click();
  await expect(page.getByText(/% coberto|Cobertura total/)).toBeVisible();

  await page.getByRole("button", { name: "Solicitar upgrade" }).click();
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened).toHaveLength(1);
  const message = decodeURIComponent(opened[0]!.split("text=")[1]!);
  expect(message).toContain(`Steam: https://steamcommunity.com/profiles/${STEAM_ID}`);
  expect(message).toContain(`Trade link: ${TRADE_LINK}`);
  expect(message).toContain("AK-47 | Redline (Field-Tested) — estimativa");
  expect(message).toContain("Sawed-Off | The Kraken (Minimal Wear) — a avaliar");
  expect(message).toContain("M4A4 | Neo-Noir");

  // Persistência e limpeza
  await page.reload();
  await page.getByRole("tab", { name: /Upgrades/ }).click();
  await expect(page.getByText("2/6")).toBeVisible();
  await page.getByRole("button", { name: "Limpar" }).click();
  await expect(page.getByText("0/6")).toBeVisible();
  expect(errors).toEqual([]);
});

test("upgrade: inventário privado mostra como resolver", async ({ page }) => {
  await page.route("**/api/steam/inventory?**", (route) => route.fulfill({ status: 502, json: { ok: false, code: "private" } }));
  await page.goto("/");
  await page.getByRole("tab", { name: /Upgrades/ }).click();
  await page.getByRole("button", { name: /inventário Steam|Adicionar skin/ }).click();
  const dialog = page.getByRole("dialog", { name: "Seu inventário Steam" });
  await dialog.getByPlaceholder(/tradeoffer/).fill(TRADE_LINK);
  await dialog.getByRole("button", { name: "Carregar meu inventário" }).click();
  await expect(dialog.getByText(/inventário está privado/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
});
