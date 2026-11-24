import { CATEGORIES, RARITIES } from "@/config/catalog";
import { DEMO_KITS } from "@/data/demo/kits";
import { DEMO_SKINS } from "@/data/demo/skins";
import type { CatalogRepository } from "./catalog-repository";

/** Repositório em memória com dados DEMONSTRATIVOS. */
export const demoCatalogRepository: CatalogRepository = {
  source: { isDemo: true, label: "Dados demonstrativos — preços não são reais" },
  async listSkins() {
    return DEMO_SKINS;
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
