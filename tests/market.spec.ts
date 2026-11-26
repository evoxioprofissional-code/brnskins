import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/** Tela "Preços de mercado": mostra a sincronização e recalcula os preços com a regra. */
const env = Object.fromEntries(
  (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
test.skip(!env.ADMIN_PASSWORD || !env.SUPABASE_SERVICE_ROLE_KEY, "Admin ou Supabase não configurados");

const db = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

test("preços de mercado: cobertura, prévia e recálculo com a margem", async ({ page, isMobile }) => {
  test.skip(isMobile, "Altera dados reais: roda uma vez (desktop)");
  // Guarda a regra atual para devolver no final, aconteça o que acontecer
  const { data: saved } = await db().from("settings").select("value").eq("key", "pricing").single();

  try {
    await page.goto("/admin/login");
    await page.getByLabel("Senha").fill(env.ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/admin$/);
    await page.goto("/admin/mercado");

    await expect(page.getByRole("heading", { name: "Cobertura por mercado" })).toBeVisible();
    await expect(page.getByText("AK-47 | Redline (Field-Tested)")).toBeVisible();

    // Modo revendedor: preço = ¥ × cotação
    await page.getByRole("radio", { name: /¥ × cotação/ }).click();
    await page.getByRole("button", { name: "0,82" }).click();
    await expect(page.getByText("com a regra nova")).toBeVisible();
    await page.getByRole("button", { name: "Aplicar e recalcular preços" }).click();
    await expect(page.getByText(/Preços recalculados/)).toBeVisible({ timeout: 30_000 });
    const { data: changed } = await db().from("settings").select("value").eq("key", "pricing").single();
    expect(changed!.value).toMatchObject({ mode: "cny", cny_rate: 0.82 });

    // Dólar + margem continua disponível
    await page.getByRole("radio", { name: /Dólar \+ margem/ }).click();
    await expect(page.getByLabel("Margem da loja (%)")).toBeVisible();
  } finally {
    const client = db();
    await client.from("settings").upsert({ key: "pricing", value: saved!.value, is_public: false });
    await client.rpc("reprice_market_offers");
  }
});
