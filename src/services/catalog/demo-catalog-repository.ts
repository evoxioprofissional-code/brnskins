import { CATEGORIES, RARITIES } from "@/config/catalog";
import { DEMO_KITS } from "@/data/demo/kits";
import { DEMO_SKINS } from "@/data/demo/skins";
import { queryInMemory } from "@/lib/catalog-query";
import type { CatalogRepository } from "./catalog-repository";

/** Repositório em memória com dados DEMONSTRATIVOS. */
export const demoCatalogRepository: CatalogRepository & { listSkins(): Promise<typeof DEMO_SKINS> } = {
  source: { isDemo: true, label: "Dados demonstrativos — preços não são reais" },
  /** Lista completa (somente no catálogo de exemplo; usado pelo painel demo) */
  async listSkins() {
    return DEMO_SKINS;
  },
  async queryCatalog(query) {
    return queryInMemory(DEMO_SKINS, query);
  },
  async getSkins(ids) {
    const set = new Set(ids);
    return DEMO_SKINS.filter((s) => set.has(s.id));
  },
  async getSkinsByMarketName(names) {
    const set = new Set(names);
    return DEMO_SKINS.filter((s) => set.has(s.marketName));
  },
  async getSkin(idOrSlug) {
    return DEMO_SKINS.find((s) => s.id === idOrSlug || s.slug === idOrSlug) ?? null;
  },
  async listKits() {
    return DEMO_KITS;
  },
  async listCategories() {
    return CATEGORIES;
  },
  async listRarities() {
    return RARITIES;
  },
};
