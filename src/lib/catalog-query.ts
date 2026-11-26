import type { CategoryId, RarityId, Skin, WearCode } from "@/types/catalog";
import { EMPTY_FILTERS, type CatalogFilters, type SortOption, type TriState } from "@/types/filters";
import { CATEGORIES, RARITIES, SORT_OPTIONS, WEAR_CODES } from "@/config/catalog";
import { discountPercent, getOffer, skinDisplayName } from "./skin";

/**
 * Consulta paginada do catálogo — mesma forma no servidor (repositórios)
 * e no cliente (rota /api/catalog).
 */
export const CATALOG_PAGE_SIZE = 48;
export const MAX_PAGE_SIZE = 60;

export interface CatalogQuery {
  filters: CatalogFilters;
  sort: SortOption;
  page: number;
  pageSize: number;
}

export interface CatalogPage {
  items: Skin[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  /** Itens por categoria considerando os demais filtros */
  counts: Record<string, number>;
  /** Menor e maior preço do catálogo (para o slider) */
  priceBounds: [number, number];
  /** Armas disponíveis com quantidade (na categoria atual, sem o filtro de arma) */
  weaponCounts: WeaponCount[];
}

export interface WeaponCount {
  weapon: string;
  category: CategoryId;
  count: number;
}

/** Categorias que têm armas (o filtro "Arma" só aparece nelas) */
export const WEAPON_CATEGORIES: CategoryId[] = ["rifle", "sniper", "pistol", "smg", "heavy", "knife", "gloves", "equipment"];

export const DEFAULT_QUERY: CatalogQuery = { filters: EMPTY_FILTERS, sort: "featured", page: 1, pageSize: CATALOG_PAGE_SIZE };

/* ------------------------------------------------------------- URL <-> query */

const triToParam = (v: TriState) => (v === "all" ? null : v === "yes" ? "1" : "0");
const paramToTri = (v: string | null): TriState => (v === "1" ? "yes" : v === "0" ? "no" : "all");
const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const num = (v: string | null) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function queryToParams(q: CatalogQuery): URLSearchParams {
  const p = new URLSearchParams();
  const f = q.filters;
  if (f.query.trim()) p.set("q", f.query.trim());
  if (f.category !== "all") p.set("cat", f.category);
  if (f.weapons.length) p.set("weap", f.weapons.join(","));
  if (f.wears.length) p.set("wears", f.wears.join(","));
  if (f.rarities.length) p.set("rar", f.rarities.join(","));
  if (f.minPrice != null) p.set("min", String(f.minPrice));
  if (f.maxPrice != null) p.set("max", String(f.maxPrice));
  if (f.edition !== "all") p.set("star", f.edition === "star" ? "1" : "0");
  const st = triToParam(f.stattrak);
  if (st) p.set("st", st);
  const sv = triToParam(f.souvenir);
  if (sv) p.set("sv", sv);
  if (q.sort !== "featured") p.set("sort", q.sort);
  if (q.page > 1) p.set("page", String(q.page));
  if (q.pageSize !== CATALOG_PAGE_SIZE) p.set("size", String(q.pageSize));
  return p;
}

export function paramsToQuery(p: URLSearchParams): CatalogQuery {
  const cat = p.get("cat");
  const sort = p.get("sort");
  const star = p.get("star");
  return {
    filters: {
      ...EMPTY_FILTERS,
      query: (p.get("q") ?? "").slice(0, 80),
      category: CATEGORIES.some((c) => c.id === cat) ? (cat as CategoryId) : "all",
      weapons: list(p.get("weap")).map((w) => w.slice(0, 40)).slice(0, 20),
      wears: list(p.get("wears")).filter((w): w is WearCode => WEAR_CODES.includes(w as WearCode)),
      rarities: list(p.get("rar")).filter((r): r is RarityId => RARITIES.some((x) => x.id === r)),
      minPrice: num(p.get("min")),
      maxPrice: num(p.get("max")),
      edition: star === "1" ? "star" : star === "0" ? "standard" : "all",
      stattrak: paramToTri(p.get("st")),
      souvenir: paramToTri(p.get("sv")),
    },
    sort: SORT_OPTIONS.some((s) => s.id === sort) ? (sort as SortOption) : "featured",
    page: Math.max(1, Math.min(10_000, Math.floor(Number(p.get("page")) || 1))),
    pageSize: Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(Number(p.get("size")) || CATALOG_PAGE_SIZE))),
  };
}

/** Palavras da busca (sem acento e sem símbolos do nome de mercado). */
export const searchTokens = (q: string) =>
  q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[|★™()%_\\]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);

/* ------------------------------------------------- filtro em memória (demo) */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function applyFilters(skins: Skin[], f: CatalogFilters): Skin[] {
  const tokens = searchTokens(f.query);
  return skins.filter((skin) => {
    if (tokens.length) {
      const hay = normalize(`${skinDisplayName(skin)} ${skin.marketName}`);
      if (!tokens.every((t) => hay.includes(t))) return false;
    }
    if (f.category !== "all" && skin.category !== f.category) return false;
    if (f.weapons.length && !f.weapons.includes(skin.weapon)) return false;
    if (f.rarities.length && !f.rarities.includes(skin.rarity)) return false;
    if (f.colors.length && !skin.colors.some((c) => f.colors.includes(c))) return false;
    if (f.edition === "star" && !skin.isStar) return false;
    if (f.edition === "standard" && skin.isStar) return false;
    if (f.stattrak === "yes" && !skin.variants.includes("stattrak")) return false;
    if (f.stattrak === "no" && skin.variants.includes("stattrak")) return false;
    if (f.souvenir === "yes" && !skin.variants.includes("souvenir")) return false;
    if (f.souvenir === "no" && skin.variants.includes("souvenir")) return false;
    if (f.wears.length && skin.noWear) return false;
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
  const out = [...skins];
  const price = (s: Skin) => Math.min(...s.offers.map((o) => o.price));
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => price(a) - price(b));
    case "price-desc":
      return out.sort((a, b) => price(b) - price(a));
    case "discount":
      return out.sort((a, b) => discountPercent(getOffer(b)) - discountPercent(getOffer(a)));
    case "newest":
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "name":
      return out.sort((a, b) => skinDisplayName(a).localeCompare(skinDisplayName(b), "pt-BR"));
    case "featured":
    default:
      return out.sort((a, b) => a.featuredRank - b.featuredRank);
  }
}

/** Executa a consulta inteira em memória (catálogo demonstrativo). */
export function queryInMemory(all: Skin[], q: CatalogQuery): CatalogPage {
  const base = applyFilters(all, { ...q.filters, category: "all" });
  const weaponBase = applyFilters(all, { ...q.filters, weapons: [] }).filter((s) => WEAPON_CATEGORIES.includes(s.category));
  const weaponMap = new Map<string, WeaponCount>();
  for (const s of weaponBase) {
    const w = weaponMap.get(s.weapon) ?? { weapon: s.weapon, category: s.category, count: 0 };
    w.count++;
    weaponMap.set(s.weapon, w);
  }
  const counts: Record<string, number> = { all: base.length };
  for (const s of base) counts[s.category] = (counts[s.category] ?? 0) + 1;
  const filtered = q.filters.category === "all" ? base : base.filter((s) => s.category === q.filters.category);
  const sorted = sortSkins(filtered, q.sort);
  const pages = Math.max(1, Math.ceil(sorted.length / q.pageSize));
  const page = Math.min(q.page, pages);
  const prices = all.flatMap((s) => s.offers.map((o) => o.price));
  return {
    items: sorted.slice((page - 1) * q.pageSize, page * q.pageSize),
    total: sorted.length,
    page,
    pageSize: q.pageSize,
    pages,
    counts,
    priceBounds: [Math.min(...prices), Math.max(...prices)],
    weaponCounts: [...weaponMap.values()].sort((a, b) => b.count - a.count),
  };
}
