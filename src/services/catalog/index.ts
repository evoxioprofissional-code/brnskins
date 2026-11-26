import { siteConfig } from "@/config/site";
import type { CatalogRepository } from "./catalog-repository";
import { demoCatalogRepository } from "./demo-catalog-repository";
import { hasSyncedCatalog, supabaseCatalogRepository } from "./supabase-catalog-repository";

export type { CatalogRepository } from "./catalog-repository";

/**
 * Ponto único de acesso ao catálogo.
 * - "supabase": skins e preços sincronizados (npm run catalog:sync).
 *   Enquanto não houver catálogo sincronizado, usa os dados demonstrativos.
 * - "demo": dados demonstrativos.
 */
export async function getCatalogRepository(): Promise<CatalogRepository> {
  if (siteConfig.catalogSource === "supabase" && (await hasSyncedCatalog())) return supabaseCatalogRepository;
  return demoCatalogRepository;
}
