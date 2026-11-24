/**
 * Capturas de revisão (mobile + páginas internas + admin).
 * Uso: node scripts/screens.mjs  → visual-output/screens/*.png
 */
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "visual-output/screens";
fs.mkdirSync(OUT, { recursive: true });

const env = Object.fromEntries(
  (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

const browser = await chromium.launch();

// Mobile
const m = await browser.newContext({ ...devices["Pixel 7"] });
const mp = await m.newPage();
await mp.goto(BASE, { waitUntil: "networkidle" });
await mp.screenshot({ path: `${OUT}/m-home.png` });
await mp.screenshot({ path: `${OUT}/m-home-full.png`, fullPage: true });
await mp.getByRole("button", { name: /^Filtros/ }).click();
await mp.waitForTimeout(500);
await mp.screenshot({ path: `${OUT}/m-filters.png` });
await mp.getByRole("button", { name: /Ver \d+ resultado/ }).click();
await mp.getByRole("button", { name: "Ver detalhes de AWP | Fade" }).first().click();
await mp.waitForTimeout(600);
await mp.screenshot({ path: `${OUT}/m-drawer.png` });
await m.close();

// Desktop páginas
const d = await browser.newContext({ viewport: { width: 1648, height: 928 } });
const dp = await d.newPage();
await dp.goto(`${BASE}/`, { waitUntil: "networkidle" });
await dp.screenshot({ path: `${OUT}/d-home-closed.png` });
await dp.goto(`${BASE}/kits`, { waitUntil: "networkidle" });
await dp.screenshot({ path: `${OUT}/d-kits.png` });
await dp.getByRole("button", { name: "Adicionar kit ao carrinho" }).first().click();
await dp.goto(`${BASE}/carrinho`, { waitUntil: "networkidle" });
await dp.screenshot({ path: `${OUT}/d-cart.png` });
if (env.ADMIN_PASSWORD) {
  await dp.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await dp.getByLabel("Senha").fill(env.ADMIN_PASSWORD);
  await dp.getByRole("button", { name: "Entrar" }).click();
  await dp.waitForURL(/\/admin$/);
  await dp.waitForLoadState("networkidle");
  await dp.screenshot({ path: `${OUT}/d-admin.png` });
  await dp.goto(`${BASE}/admin/precos`, { waitUntil: "networkidle" });
  await dp.screenshot({ path: `${OUT}/d-admin-precos.png` });
}
await browser.close();
console.log("ok");
