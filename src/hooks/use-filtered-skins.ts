"use client";

import { useMemo } from "react";
import type { Skin } from "@/types/catalog";
import type { CatalogFilters, SortOption } from "@/types/filters";
import { discountPercent, getOffer, skinDisplayName } from "@/lib/skin";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function applyFilters(skins: Skin[], f: CatalogFilters): Skin[] {
  const q = normalize(f.query.trim());
  return skins.filter((skin) => {
    if (q && !normalize(skinDisplayName(skin)).includes(q)) return false;
    if (f.category !== "all" && skin.category !== f.category) return false;
    if (f.rarities.length && !f.rarities.includes(skin.rarity)) return false;
    if (f.colors.length && !skin.colors.some((c) => f.colors.includes(c))) return false;
    if (f.edition === "star" && !skin.isStar) return false;
    if (f.edition === "standard" && skin.isStar) return false;
    if (f.stattrak === "yes" && !skin.variants.includes("stattrak")) return false;
    if (f.stattrak === "no" && skin.variants.includes("stattrak")) return false;
    if (f.souvenir === "yes" && !skin.variants.includes("souvenir")) return false;
    if (f.souvenir === "no" && skin.variants.includes("souvenir")) return false;

    const offers = f.wears.length ? skin.offers.filter((o) => f.wears.includes(o.wear)) : skin.offers;
    if (!offers.length) return false;
    if (f.minPrice !== null || f.maxPrice !== null) {
      const min = f.minPrice ?? 0;
      const max = f.maxPrice ?? Number.POSITIVE_INFINITY;
      if (!offers.some((o) => o.price >= min && o.price <= max)) return false;
    }
    return true;
  });
}

export function sortSkins(skins: Skin[], sort: SortOption): Skin[] {
  const list = [...skins];
  const price = (s: Skin) => getOffer(s).price;
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => price(a) - price(b));
    case "price-desc":
      return list.sort((a, b) => price(b) - price(a));
    case "discount":
      return list.sort((a, b) => discountPercent(getOffer(b)) - discountPercent(getOffer(a)));
    case "newest":
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "name":
      return list.sort((a, b) => skinDisplayName(a).localeCompare(skinDisplayName(b), "pt-BR"));
    case "featured":
    default:
      return list.sort((a, b) => a.featuredRank - b.featuredRank);
  }
}

export function useFilteredSkins(skins: Skin[], filters: CatalogFilters, sort: SortOption) {
  return useMemo(() => sortSkins(applyFilters(skins, filters), sort), [skins, filters, sort]);
}

/** Contagem por categoria considerando os demais filtros ativos. */
export function useCategoryCounts(skins: Skin[], filters: CatalogFilters) {
  return useMemo(() => {
    const base = applyFilters(skins, { ...filters, category: "all" });
    const counts: Record<string, number> = { all: base.length };
    for (const s of base) counts[s.category] = (counts[s.category] ?? 0) + 1;
    return counts;
  }, [skins, filters]);
}
