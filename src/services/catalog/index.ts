import { siteConfig } from "@/config/site";
import type { CatalogRepository } from "./catalog-repository";
import { demoCatalogRepository } from "./demo-catalog-repository";

export type { CatalogRepository } from "./catalog-repository";

/**
 * Ponto único de acesso ao catálogo.
 * Quando a integração com Supabase for configurada, adicione aqui a
 * implementação correspondente (ex.: `createSupabaseCatalogRepository()`).
 */
export function getCatalogRepository(): CatalogRepository {
  switch (siteConfig.catalogSource) {
    case "supabase":
      // Integração ainda não configurada: mantém os dados demonstrativos.
      return demoCatalogRepository;
    case "demo":
    default:
      return demoCatalogRepository;
  }
}
