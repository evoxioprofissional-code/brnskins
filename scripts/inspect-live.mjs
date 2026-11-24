// Validação ao vivo do BRN Inspect 3D: aciona os controles e registra as mensagens reais do CS2Inspect.
import { chromium } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync("visual-output/live", { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const log = [];
await page.addInitScript(() => {
  window.__cs2 = [];
  window.addEventListener("message", (e) => {
    if (e.data && e.data.source === "cs2inspect-embed") window.__cs2.push({ t: Date.now(), ...e.data });
  });
});
page.on("pageerror", (e) => log.push("pageerror " + e.message));
page.on("console", (m) => m.type() === "error" && log.push("console " + m.text().slice(0, 200)));
const msgs = async () => page.evaluate(() => window.__cs2.splice(0).map((m) => ({ type: m.type, reason: m.reason, message: m.message, view: m.view, item: m.item ? (m.item.name ?? JSON.stringify(m.item).slice(0, 120)) : undefined })));
const shot = (n) => page.screenshot({ path: `visual-output/live/${n}.png`, timeout: 45000 }).catch(() => console.log(`  (captura ${n} pulada)`));
const step = async (name, fn, wait = 2500) => {
  await fn();
  await page.waitForTimeout(wait);
  const m = await msgs();
  console.log(`[${name}]`, JSON.stringify(m));
  await shot(name);
};

await page.goto("http://localhost:3000/inspect?skin=demo-awp-fade&wear=0.0074", { waitUntil: "domcontentloaded" });
await step("01-load", async () => {}, 15000);
await step("02-float-mw", () => page.getByRole("button", { name: "MW", exact: true }).click());
await step("03-seed", () => page.getByLabel("Valor exato (0–1000)").fill("661"));
await step("04-stattrak", () => page.getByLabel("StatTrak").check());
await step("05-scene", async () => { await page.getByRole("tab", { name: "Mapa" }).click(); await page.getByRole("button", { name: "Dust II" }).click(); }, 6000);
await step("06-hands", () => page.getByRole("radio", { name: /1ª pessoa/ }).click(), 6000);
await step("07-fire", () => page.getByRole("button", { name: "Disparar" }).click(), 1500);
await step("08-reload", () => page.getByRole("button", { name: "Recarregar" }).click(), 2500);
await step("09-inspect", () => page.getByRole("button", { name: "Animação de inspeção" }).click(), 3000);
await step("10-gloves", async () => { await page.getByRole("tab", { name: "Luvas" }).click(); await page.getByRole("button", { name: /Luvas Esportivas/ }).click(); }, 6000);
await step("11-agent", async () => { await page.getByRole("tab", { name: "Agente" }).click(); await page.getByRole("button", { name: "SAS (CT)" }).click(); }, 7000);
await step("12-agent-walk", () => page.getByRole("button", { name: "Andando", exact: true }).click(), 3000);
await step("13-agent-reload", () => page.getByRole("button", { name: "Recarregar", exact: true }).first().click(), 2500);
await step("14-item-view", () => page.getByRole("radio", { name: /360/ }).click(), 4000);
await step("15-stickers", async () => { await page.getByRole("tab", { name: "Adesivos" }).click(); await page.getByLabel("Slot 1 · nº do adesivo").fill("5032"); }, 5000);
await step("16-charm", async () => { await page.getByRole("tab", { name: "Amuleto" }).click(); await page.getByLabel("Nº do amuleto").fill("1"); }, 5000);
await step("17-scene-none", async () => { await page.getByRole("tab", { name: "Mapa" }).click(); await page.getByRole("button", { name: "Estúdio BRN" }).click(); }, 4000);
await step("18-search", async () => { await page.getByLabel("Buscar skin para inspecionar").fill("karambit doppler"); await page.getByRole("button", { name: /Karambit \| Doppler/ }).click(); }, 7000);
await step("19-hide-ui", () => page.keyboard.press("h"), 1500);
console.log("LOG", log);
await browser.close();
