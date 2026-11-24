/**
 * Validação pixel-perfect: abre o site no Playwright em 1648x928, abre o
 * drawer da primeira skin, captura a tela e compara com a referência.
 *
 * Uso:  npm run dev  (em outro terminal)  →  npm run visual
 * Saída: visual-output/current.png, visual-output/diff.png
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("visual-output");
const REF = path.resolve("references/redesign-desktop-1648x928.png");
const VIEWPORT = { width: 1648, height: 928 };

// 12 favoritos (fora dos cards visíveis) para reproduzir "Favoritos (12)" da referência.
const FAVORITES = [
  "demo-karambit-doppler", "demo-ak-47-redline", "demo-usp-s-kill-confirmed", "demo-m4a1-s-printstream",
  "demo-desert-eagle-blaze", "demo-luvas-esportivas-vice", "demo-awp-dragon-lore", "demo-glock-18-fade",
  "demo-p90-asiimov", "demo-nova-hyper-beast", "demo-karambit-fade", "demo-mp9-starlight-protector",
];

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
await page.addInitScript((ids) => {
  localStorage.setItem("brn-favorites", JSON.stringify({ state: { ids }, version: 1 }));
}, FAVORITES);

await page.goto(BASE_URL, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.getByRole("button", { name: "Ver detalhes de AWP | Fade" }).first().click();
await page.waitForTimeout(900);
await page.mouse.move(5, 900);
await page.waitForTimeout(200);

const currentPath = path.join(OUT, "current.png");
await page.screenshot({ path: currentPath });
await browser.close();

if (!fs.existsSync(REF)) {
  console.log(`Screenshot salva em ${currentPath} (referência ${REF} não encontrada).`);
  process.exit(0);
}

const a = PNG.sync.read(fs.readFileSync(currentPath));
const b = PNG.sync.read(fs.readFileSync(REF));
const diff = new PNG({ width: a.width, height: a.height });
const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.15 });
fs.writeFileSync(path.join(OUT, "diff.png"), PNG.sync.write(diff));
const pct = ((mismatched / (a.width * a.height)) * 100).toFixed(2);
console.log(`Diferença: ${pct}% dos pixels (${mismatched}). Arquivos em ${OUT}`);
