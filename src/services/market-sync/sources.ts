/**
 * Fontes públicas e gratuitas usadas na sincronização do catálogo.
 *
 * - Catálogo: ByMykel/CSGO-API (projeto aberto no GitHub).
 * - Preços: arquivos públicos do CSGO Trader (extensão de código aberto),
 *   um por mercado, em USD, atualizados cerca de uma vez por dia.
 *   Não é uma API oficial nem tem garantia de funcionamento: o site guarda
 *   o último preço no banco e segue funcionando se a fonte falhar.
 */
export const CATALOG_BASE_URL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";
export const PRICE_BASE_URL = "https://prices.csgotrader.app/latest";

export const MARKET_SOURCES = ["buff163", "c5game", "csfloat", "skinport", "steam"] as const;
export type MarketSource = (typeof MARKET_SOURCES)[number];

export const MARKET_LABELS: Record<MarketSource, string> = {
  buff163: "BUFF163",
  c5game: "C5Game",
  csfloat: "CSFloat",
  skinport: "Skinport",
  steam: "Steam",
};

type PriceNode = number | null | { price?: number | null } | undefined;
const num = (v: PriceNode): number | null => {
  const n = typeof v === "number" ? v : v && typeof v === "object" ? (v.price ?? null) : null;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
};

/** Extrai o preço de venda (menor anúncio) de cada formato de arquivo. */
export function extractUsd(source: MarketSource, entry: unknown): number | null {
  if (entry == null) return null;
  const e = entry as Record<string, PriceNode>;
  switch (source) {
    case "buff163":
    case "c5game":
      return num(e.starting_at);
    case "csfloat":
      return num(e.price as PriceNode) ?? num(e.starting_at);
    case "skinport":
      return num(e.starting_at);
    case "steam":
      return num(e.last_24h as PriceNode) ?? num(e.last_7d as PriceNode) ?? num(e.last_30d as PriceNode);
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`${url} respondeu ${res.status}`);
  return (await res.json()) as T;
}
