import type { WearCode } from "@/types/catalog";

/**
 * Contrato para provedores externos de preço (ex.: referência Steam,
 * marketplaces). Nenhum provedor está configurado ainda — implemente esta
 * interface quando houver endpoint e credenciais oficiais.
 */
export interface PriceQuote {
  marketHashName: string;
  wear: WearCode;
  price: number;
  currency: "BRL";
  fetchedAt: string;
  source: string;
}

export interface PriceProvider {
  readonly id: string;
  getQuotes(marketHashNames: string[]): Promise<PriceQuote[]>;
}

/** Monta o market_hash_name padrão da Steam. */
export function toMarketHashName(params: {
  weapon: string;
  finish: string;
  wearName: string;
  isStar?: boolean;
  stattrak?: boolean;
  souvenir?: boolean;
}) {
  const prefix = [
    params.isStar ? "★" : null,
    params.stattrak ? "StatTrak™" : null,
    params.souvenir ? "Souvenir" : null,
  ]
    .filter(Boolean)
    .join(" ");
  return `${prefix ? prefix + " " : ""}${params.weapon} | ${params.finish} (${params.wearName})`;
}
