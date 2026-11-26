import type { CategoryId, RarityId, SkinColor, WearCode } from "./catalog";

export type SortOption =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "discount"
  | "newest"
  | "name";

export type TriState = "all" | "yes" | "no";
export type EditionFilter = "all" | "standard" | "star";
export type ViewMode = "grid" | "list";

export interface CatalogFilters {
  query: string;
  minPrice: number | null;
  maxPrice: number | null;
  category: CategoryId | "all";
  /** Armas específicas (ex.: "AK-47", "AWP") — nome base do item */
  weapons: string[];
  wears: WearCode[];
  rarities: RarityId[];
  colors: SkinColor[];
  edition: EditionFilter;
  stattrak: TriState;
  souvenir: TriState;
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  minPrice: null,
  maxPrice: null,
  category: "all",
  weapons: [],
  wears: [],
  rarities: [],
  colors: [],
  edition: "all",
  stattrak: "all",
  souvenir: "all",
};
