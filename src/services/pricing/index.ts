import type { PriceProvider } from "./price-provider";

export * from "./price-provider";

/** Registro de provedores de preço. Vazio até que uma integração real seja fornecida. */
export const priceProviders: PriceProvider[] = [];
