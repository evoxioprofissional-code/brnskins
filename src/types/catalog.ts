/**
 * Tipos de domínio do catálogo BRN Skins.
 * Independentes da fonte de dados (demo, Supabase ou APIs externas futuras).
 */

export type CategoryId =
  | "rifle"
  | "sniper"
  | "pistol"
  | "smg"
  | "heavy"
  | "knife"
  | "gloves"
  | "agent"
  | "equipment"
  | "sticker"
  | "case"
  | "graffiti"
  | "music"
  | "patch"
  | "charm";

export interface Category {
  id: CategoryId;
  /** Nome exibido na sidebar (ex.: "Pistola") */
  label: string;
  /** Rótulo curto usado no badge do card (ex.: "PISTOLA") */
  badge: string;
  sortOrder: number;
}

export type RarityId =
  | "consumer"
  | "industrial"
  | "milspec"
  | "restricted"
  | "classified"
  | "covert"
  | "extraordinary"
  | "contraband"
  | "master";

export interface Rarity {
  id: RarityId;
  /** Nome oficial (Steam) */
  name: string;
  /** Nome em português para filtros */
  label: string;
  /** Cor oficial da raridade */
  color: string;
  sortOrder: number;
}

export type WearCode = "FN" | "MW" | "FT" | "WW" | "BS";

export interface Wear {
  code: WearCode;
  name: string;
  label: string;
  minFloat: number;
  maxFloat: number;
}

export type VariantType = "normal" | "stattrak" | "souvenir";

export type SkinColor =
  | "red"
  | "pink"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "white"
  | "black"
  | "gray";

/** Oferta de uma condição específica (preço e float de referência). */
export interface WearOffer {
  wear: WearCode;
  price: number;
  /** Preço de referência na Steam para comparação */
  steamPrice: number;
  float: number;
  available: boolean;
  /** Preço real por versão (StatTrak™/Souvenir), quando a fonte informa */
  variantPrices?: Partial<Record<VariantType, number>>;
}

export interface Skin {
  id: string;
  slug: string;
  /** Arma / item base (ex.: "AWP") */
  weapon: string;
  /** Nome do acabamento (ex.: "Fade") */
  finish: string;
  /** Item com estrela (facas e luvas) */
  isStar: boolean;
  /** Nome base no mercado da Steam, sem condição (ex.: "★ Karambit | Doppler") */
  marketName: string;
  /** Item sem condição de desgaste (adesivo, caixa, agente, faca vanilla...).
   *  Nesse caso há uma única oferta e a condição não é exibida. */
  noWear?: boolean;
  category: CategoryId;
  rarity: RarityId;
  image: string;
  colors: SkinColor[];
  /** Variações disponíveis para venda */
  variants: VariantType[];
  /** Condição padrão exibida no card */
  defaultWear: WearCode;
  offers: WearOffer[];
  deliveryEstimate: string;
  /** Posição em "Destaques" (menor = primeiro) */
  featuredRank: number;
  createdAt: string;
}

export interface KitItem {
  skinId: string;
  wear: WearCode;
  variant: VariantType;
}

export interface Kit {
  id: string;
  slug: string;
  name: string;
  description: string;
  items: KitItem[];
  /** Preço promocional do conjunto */
  price: number;
  tag?: string;
}

export interface CatalogDataSource {
  /** true quando os dados são demonstrativos e não refletem preços reais */
  isDemo: boolean;
  label: string;
}
