/**
 * Regras do Upgrade Lab.
 * Ajuste conforme a política comercial da loja — a avaliação final é sempre
 * feita pela equipe; estes números servem apenas para a estimativa na tela.
 */
export const UPGRADE = {
  /** Fração do valor de referência considerada na estimativa das skins entregues */
  tradeInRate: 0.85,
  /** Máximo de skins que o cliente pode oferecer de uma vez */
  maxOfferItems: 6,
  /** Multiplicadores usados para sugerir alvos */
  multipliers: [1.5, 2, 3, 5, 10] as const,
  /** Quantidade de sugestões exibidas */
  suggestionCount: 8,
} as const;

export type UpgradeMultiplier = (typeof UPGRADE.multipliers)[number];
