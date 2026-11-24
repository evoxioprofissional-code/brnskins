// Utilitário de depuração: imprime caixas de elementos-chave em 1648x928.
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1648, height: 928 } });
await page.goto(process.env.BASE_URL ?? "http://localhost:3000", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Ver detalhes de AWP | Fade" }).first().click();
await page.waitForTimeout(900);
const out = await page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  const res = {};
  document.querySelectorAll('[role="tab"]').forEach((t, i) => (res["tab" + i] = r(t)));
  const nav = document.querySelectorAll('nav[aria-label="Principal"] a');
  nav.forEach((a, i) => (res["nav" + i] = r(a)));
  const logo = document.querySelector('header img'); if (logo) res.logo = r(logo);
  const promo = document.querySelector('img[alt="BRN Skins"]'); if (promo) res.promoLogo = r(promo);
  return res;
});
console.log(JSON.stringify(out));
await browser.close();
