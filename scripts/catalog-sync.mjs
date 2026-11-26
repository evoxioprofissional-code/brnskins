/**
 * Dispara a sincronização do catálogo e dos preços no servidor do site.
 * Uso: npm run catalog:sync            (servidor local em http://localhost:3000)
 *      BASE_URL=https://seusite.com npm run catalog:sync
 * Em produção, agende a mesma chamada uma vez por dia no cron da hospedagem.
 */
import { loadEnv } from "./db.mjs";

const env = loadEnv();
const base = process.env.BASE_URL ?? "http://localhost:3000";
if (!env.CRON_SECRET && !process.env.CRON_SECRET) {
  console.error("Defina CRON_SECRET no .env.local");
  process.exit(1);
}
const started = Date.now();
console.log(`Sincronizando catálogo em ${base} ...`);
const res = await fetch(`${base}/api/cron/catalog-sync`, {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? env.CRON_SECRET}` },
});
const body = await res.json().catch(() => ({}));
if (!res.ok || !body.ok) {
  console.error(`Falhou (${res.status}):`, body.error ?? body);
  process.exit(1);
}
const r = body.result;
console.log(`OK em ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(`Skins: ${r.skins} · Ofertas com preço: ${r.priced} · Dólar: R$ ${r.usdBrl}`);
console.log("Preços por mercado:", r.sources);
