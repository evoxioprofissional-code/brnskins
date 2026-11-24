// Capturas do painel admin (faz login com a senha local do .env.local).
import { chromium } from "@playwright/test";
import fs from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const pages = (process.argv[2] ?? "admin").split(",").map((p) => "/" + p.replace(/^[/]+/, ""));
const width = Number(process.argv[3] ?? 1672);
const height = Number(process.argv[4] ?? 941);
fs.mkdirSync("visual-output/admin", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 300)));
await page.goto(`${BASE}/admin/login`);
await page.getByLabel("Senha").fill(env.ADMIN_PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(/\/admin$/);
for (const p of pages) {
  await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const name = (p.replace(/\//g, "_").replace(/^_/, "") || "admin") + `-${width}`;
  await page.screenshot({ path: `visual-output/admin/${name}.png`, fullPage: process.argv[5] === "full" });
}
console.log(errs.length ? errs : "sem erros");
await browser.close();
