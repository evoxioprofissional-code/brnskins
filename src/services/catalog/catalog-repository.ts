import type { CatalogDataSource, Category, Kit, Rarity, Skin } from "@/types/catalog";
import type { CatalogPage, CatalogQuery } from "@/lib/catalog-query";

/**
 * Contrato da camada de dados do catálogo.
 * Implementações: demonstrativa (em memória) e Supabase (catálogo sincronizado).
 */
export interface CatalogRepository {
  readonly source: CatalogDataSource;
  /** Página do catálogo com filtros, ordenação e contagens (busca no servidor) */
  queryCatalog(query: CatalogQuery): Promise<CatalogPage>;
  /** Itens específicos (favoritos, kits, drawer) */
  getSkins(ids: string[]): Promise<Skin[]>;
  /** Itens pelo nome de mercado base (ex.: "AK-47 | Redline") — usado no upgrade */
  getSkinsByMarketName(names: string[]): Promise<Skin[]>;
  getSkin(idOrSlug: string): Promise<Skin | null>;
  listKits(): Promise<Kit[]>;
  listCategories(): Promise<Category[]>;
  listRarities(): Promise<Rarity[]>;
}
