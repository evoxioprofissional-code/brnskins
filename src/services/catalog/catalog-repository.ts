import type { CatalogDataSource, Category, Kit, Rarity, Skin } from "@/types/catalog";

/**
 * Contrato da camada de dados do catálogo.
 * Implementações: demo (atual) e Supabase / APIs externas (futuro).
 */
export interface CatalogRepository {
  readonly source: CatalogDataSource;
  listSkins(): Promise<Skin[]>;
  getSkin(idOrSlug: string): Promise<Skin | null>;
  listKits(): Promise<Kit[]>;
  listCategories(): Promise<Category[]>;
  listRarities(): Promise<Rarity[]>;
}
