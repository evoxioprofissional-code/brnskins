import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Fluxo real de indicação contra o Supabase do projeto.
 * Cria um influenciador com código único, simula um visitante e um pedido,
 * e apaga tudo no final.
 */
const env = Object.fromEntries(
  (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const configured = Boolean(env.ADMIN_PASSWORD && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
const CODE = `e2e-${Date.now().toString(36)}`;
const NAME = `Teste E2E ${CODE}`;

test.skip(!configured, "Admin ou Supabase não configurados em .env.local");
test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  if (!configured) return;
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data } = await db.from("influencers").select("id").eq("code", CODE).maybeSingle();
  if (!data) return;
  await db.from("referral_conversions").delete().eq("influencer_id", data.id);
  await db.from("influencers").delete().eq("id", data.id);
});

test("influenciador: link conta visitante, pedido gera comissão e admin aprova e paga", async ({ browser, isMobile }) => {
  test.skip(isMobile, "Fluxo de banco roda uma vez (desktop)");

  // 1) Admin cria o influenciador
  const admin = await browser.newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Senha").fill(env.ADMIN_PASSWORD!);
  await admin.getByRole("button", { name: "Entrar" }).click();
  await admin.waitForURL(/\/admin$/);
  await admin.goto("/admin/influenciadores");
  await admin.getByRole("button", { name: "Novo influenciador" }).click();
  const form = admin.getByRole("dialog", { name: "Novo influenciador" });
  await form.getByLabel("Nome").fill(NAME);
  await form.getByLabel("Código do link").fill(CODE);
  await form.getByLabel("Comissão (%)").fill("12");
  await form.getByRole("button", { name: "Criar influenciador" }).click();
  await expect(admin.getByRole("button", { name: `Ver detalhes de ${NAME}` })).toBeVisible();

  // 2) Visitante chega pelo link e faz um pedido
  const visitorCtx = await browser.newContext();
  await visitorCtx.addInitScript(() => {
    if (!localStorage.getItem("brn-settings"))
      localStorage.setItem("brn-settings", JSON.stringify({ state: { whatsapp: { phone: "5511900000000" } }, version: 1 }));
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url: string) => {
      (window as unknown as { __opened: string[] }).__opened.push(url);
      return null;
    }) as typeof window.open;
  });
  const visitor = await visitorCtx.newPage();
  await visitor.goto(`/r/${CODE}`);
  await expect(visitor).toHaveURL(/\/$/);
  const cookies = await visitorCtx.cookies();
  expect(cookies.find((c) => c.name === "brn_ref")?.value).toBe(CODE);
  expect(cookies.find((c) => c.name === "brn_vid")?.httpOnly).toBe(true);

  await visitor.getByRole("button", { name: "Ver detalhes de AWP | Fade" }).first().click();
  await visitor.getByRole("dialog", { name: /AWP \| Fade/ }).getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await visitor.goto("/carrinho");
  await visitor.getByLabel("Seu nome").fill("Cliente Indicado");
  await visitor.getByRole("button", { name: "Finalizar pelo WhatsApp" }).click();
  const opened = await visitor.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(decodeURIComponent(opened[0]!)).toContain(`Indicação: ${CODE}`);

  // 3) Admin vê visitante e comissão pendente (12% de R$ 2.521,95 = R$ 302,63)
  await expect
    .poll(async () => {
      await admin.reload();
      return admin.getByText("R$ 302,63").count();
    }, { timeout: 15_000 })
    .toBeGreaterThan(0);
  await admin.getByRole("button", { name: `Ver detalhes de ${NAME}` }).click();
  const detail = admin.getByRole("dialog", { name: "Detalhes do influenciador" });
  await expect(detail.getByText("Visitantes").locator("..").getByText("1")).toBeVisible();
  await detail.getByRole("button", { name: "Aprovar" }).click();
  await expect(detail.getByRole("button", { name: /Marcar R\$ 302,63 como pago/ })).toBeVisible();
  await detail.getByRole("button", { name: /Marcar R\$ 302,63 como pago/ }).click();
  await expect(detail.getByText("Paga", { exact: true })).toBeVisible();

  await visitorCtx.close();
  await admin.close();
});
