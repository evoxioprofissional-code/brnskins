import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIES, RARITIES, WEARS } from "@/config/catalog";
import { DEMO_KITS } from "@/data/demo/kits";
import { DEMO_SKINS } from "@/data/demo/skins";
import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { searchTokens, type CatalogPage, type CatalogQuery, type WeaponCount } from "@/lib/catalog-query";
import type { CategoryId, Kit, RarityId, Skin, VariantType, WearCode, WearOffer } from "@/types/catalog";
import type { CatalogRepository } from "./catalog-repository";

/**
 * Catálogo real: itens e preços sincronizados no Supabase (ver services/market-sync).
 * A busca, os filtros e a paginação rodam no banco; o navegador recebe só a página atual.
 * Somente no servidor.
 */

interface SkinRow {
  id: string;
  market_name: string;
  weapon: string;
  finish: string;
  is_star: boolean;
  category_id: CategoryId;
  rarity_id: RarityId;
  image_url: string;
  min_float: number | null;
  max_float: number | null;
  has_wear: boolean;
  featured_rank: number | null;
}
interface OfferRow {
  skin_id: string;
  wear: WearCode | "-";
  variant: VariantType;
  price_brl: number | string;
  steam_brl: number | string | null;
}

const SKIN_COLUMNS = "id, market_name, weapon, finish, is_star, category_id, rarity_id, image_url, min_float, max_float, has_wear, featured_rank";
const DELIVERY = "~1h";
const BOUNDS_TTL = 10 * 60_000;
let boundsCache: { at: number; value: [number, number] } | null = null;
let kitsCache: { at: number; value: Kit[] } | null = null;

/** Limpa caches após sincronizar ou mudar a regra de preço. */
export const clearCatalogCache = () => {
  boundsCache = null;
  kitsCache = null;
};

function db(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase não configurado");
  return client;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Float de referência dentro da faixa da condição e da skin. */
function referenceFloat(wear: WearCode, min: number | null, max: number | null) {
  const w = WEARS.find((x) => x.code === wear)!;
  const lo = Math.max(w.minFloat, min ?? 0);
  const hi = Math.min(w.maxFloat, max ?? 1);
  return Math.round((lo + Math.max(0, hi - lo) * 0.35) * 1e6) / 1e6;
}

function buildSkin(r: SkinRow, list: OfferRow[]): Skin | null {
  if (!list.length) return null;
  const variants = new Set<VariantType>();
  const wearOffers: WearOffer[] = [];
  // Itens sem condição viram uma única oferta (a condição não é exibida)
  const groups: [WearCode, OfferRow[]][] = r.has_wear
    ? WEARS.map((w) => [w.code, list.filter((o) => o.wear === w.code)] as [WearCode, OfferRow[]]).filter(([, l]) => l.length)
    : [["FN", list.filter((o) => o.wear === "-")]];
  for (const [wear, forWear] of groups) {
    if (!forWear.length) continue;
    const variantPrices: Partial<Record<VariantType, number>> = {};
    for (const o of forWear) {
      variants.add(o.variant);
      variantPrices[o.variant] = Number(o.price_brl);
    }
    const normal = forWear.find((o) => o.variant === "normal") ?? forWear[0]!;
    const price = Number(normal.price_brl);
    wearOffers.push({
      wear,
      price,
      steamPrice: normal.steam_brl != null ? Number(normal.steam_brl) : price,
      float: r.has_wear ? referenceFloat(wear, r.min_float == null ? null : Number(r.min_float), r.max_float == null ? null : Number(r.max_float)) : 0,
      available: true,
      variantPrices,
    });
  }
  if (!wearOffers.length) return null;
  const ordered = (["normal", "stattrak", "souvenir"] as VariantType[]).filter((v) => variants.has(v));
  return {
    id: r.id,
    slug: `${slugify(r.market_name)}-${r.id.slice(-6)}`,
    weapon: r.weapon,
    finish: r.finish,
    isStar: r.is_star,
    marketName: r.market_name,
    noWear: !r.has_wear,
    category: r.category_id,
    rarity: r.rarity_id,
    image: r.image_url,
    colors: [],
    variants: ordered.length ? ordered : ["normal"],
    defaultWear: (wearOffers.find((o) => o.wear === "FT") ?? wearOffers[0]!).wear,
    offers: wearOffers,
    deliveryEstimate: DELIVERY,
    featuredRank: r.featured_rank ?? 0,
    createdAt: new Date(0).toISOString(),
  };
}

/** Busca itens + ofertas pelos ids, na ordem pedida. */
async function loadByIds(ids: string[]): Promise<Skin[]> {
  if (!ids.length) return [];
  const client = db();
  const [rows, offers] = await Promise.all([
    client.from("market_skins").select(SKIN_COLUMNS).in("id", ids).eq("active", true),
    client.from("market_offers").select("skin_id, wear, variant, price_brl, steam_brl").in("skin_id", ids).not("price_brl", "is", null),
  ]);
  if (rows.error) throw new Error(rows.error.message);
  if (offers.error) throw new Error(offers.error.message);
  const bySkin = new Map<string, OfferRow[]>();
  for (const o of offers.data as OfferRow[]) {
    const l = bySkin.get(o.skin_id);
    if (l) l.push(o);
    else bySkin.set(o.skin_id, [o]);
  }
  const byId = new Map((rows.data as SkinRow[]).map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    const s = r ? buildSkin(r, bySkin.get(id) ?? []) : null;
    return s ? [s] : [];
  });
}

function rpcFilters(q: CatalogQuery) {
  const f = q.filters;
  const tokens = searchTokens(f.query);
  return {
    p_tokens: tokens.length ? tokens : null,
    p_wears: f.wears.length ? f.wears : null,
    p_min: f.minPrice,
    p_max: f.maxPrice,
    p_rarities: f.rarities.length ? f.rarities : null,
    p_star: f.edition === "all" ? null : f.edition === "star",
    p_stattrak: f.stattrak === "all" ? null : f.stattrak === "yes",
    p_souvenir: f.souvenir === "all" ? null : f.souvenir === "yes",
  };
}

async function priceBounds(): Promise<[number, number]> {
  if (boundsCache && Date.now() - boundsCache.at < BOUNDS_TTL) return boundsCache.value;
  const { data } = await db().rpc("market_price_bounds");
  const row = (data as { min_price: number; max_price: number }[] | null)?.[0];
  const value: [number, number] = [Math.max(0.01, Number(row?.min_price ?? 1)), Math.max(1, Number(row?.max_price ?? 1000))];
  boundsCache = { at: Date.now(), value };
  return value;
}

async function queryCatalog(q: CatalogQuery): Promise<CatalogPage> {
  const client = db();
  const filters = rpcFilters(q);
  const weapons = q.filters.weapons.length ? q.filters.weapons : null;
  const category = q.filters.category === "all" ? null : q.filters.category;
  const offset = (q.page - 1) * q.pageSize;
  const [search, counts, weaponRows, bounds] = await Promise.all([
    client.rpc("search_market_catalog", {
      ...filters,
      p_weapons: weapons,
      p_category: category,
      p_sort: q.sort,
      p_limit: q.pageSize,
      p_offset: offset,
    }),
    client.rpc("market_category_counts", { ...filters, p_weapons: weapons }),
    client.rpc("market_weapon_counts", { ...filters, p_category: category }),
    priceBounds(),
  ]);
  if (search.error) throw new Error(search.error.message);
  if (counts.error) throw new Error(counts.error.message);
  const rows = search.data as { id: string; total: number }[];
  const countMap: Record<string, number> = {};
  let all = 0;
  for (const c of counts.data as { category_id: string; n: number }[]) {
    countMap[c.category_id] = Number(c.n);
    all += Number(c.n);
  }
  countMap.all = all;
  const total = rows.length ? Number(rows[0]!.total) : q.filters.category === "all" ? all : (countMap[q.filters.category] ?? 0);
  const pages = Math.max(1, Math.ceil(total / q.pageSize));
  // Página além do fim (ex.: filtro mudou): devolve a última
  if (!rows.length && total > 0 && q.page > pages) return queryCatalog({ ...q, page: pages });
  const weaponCounts: WeaponCount[] = ((weaponRows.data ?? []) as { weapon: string; category_id: WeaponCount["category"]; n: number }[])
    .map((r) => ({ weapon: r.weapon, category: r.category_id, count: Number(r.n) }))
    .sort((a, b) => b.count - a.count);
  return {
    items: await loadByIds(rows.map((r) => r.id)),
    total,
    page: q.page,
    pageSize: q.pageSize,
    pages,
    counts: countMap,
    priceBounds: bounds,
    weaponCounts,
  };
}

/** Kits de exemplo apontam para os itens reais com o mesmo nome de mercado. */
async function listKits(): Promise<Kit[]> {
  if (kitsCache && Date.now() - kitsCache.at < BOUNDS_TTL) return kitsCache.value;
  const demoName = new Map(DEMO_SKINS.map((s) => [s.id, s.marketName]));
  const names = [...new Set(DEMO_KITS.flatMap((k) => k.items.map((i) => demoName.get(i.skinId) ?? "")))].filter(Boolean);
  const { data } = await db().from("market_skins").select("id, market_name").in("market_name", names).eq("active", true);
  const realByName = new Map((data ?? []).map((r: { id: string; market_name: string }) => [r.market_name, r.id]));
  const value = DEMO_KITS.flatMap((k) => {
    const items = k.items.map((i) => ({ ...i, skinId: realByName.get(demoName.get(i.skinId) ?? "") ?? "" }));
    return items.every((i) => i.skinId) ? [{ ...k, items }] : [];
  });
  kitsCache = { at: Date.now(), value };
  return value;
}

export const supabaseCatalogRepository: CatalogRepository = {
  source: { isDemo: false, label: "Preços de mercado (BUFF, C5, Steam e outros) atualizados diariamente" },
  queryCatalog,
  getSkins: (ids) => loadByIds([...new Set(ids)].slice(0, 200)),
  async getSkinsByMarketName(names) {
    const unique = [...new Set(names)].slice(0, 200);
    if (!unique.length) return [];
    const { data, error } = await db().from("market_skins").select("id").in("market_name", unique).eq("active", true);
    if (error) throw new Error(error.message);
    return loadByIds((data ?? []).map((r: { id: string }) => r.id));
  },
  async getSkin(idOrSlug) {
    const [direct] = await loadByIds([idOrSlug]);
    if (direct) return direct;
    // slug = "<nome>-<últimos 6 do id>"
    const suffix = idOrSlug.split("-").pop() ?? "";
    if (!/^[0-9a-z]{6}$/i.test(suffix)) return null;
    const { data } = await db().from("market_skins").select("id").like("id", `%${suffix}`).limit(1);
    const found = data?.[0]?.id as string | undefined;
    return found ? ((await loadByIds([found]))[0] ?? null) : null;
  },
  listKits,
  async listCategories() {
    return CATEGORIES;
  },
  async listRarities() {
    return RARITIES;
  },
};

/** Há catálogo sincronizado? (usado para cair no demo enquanto não houver) */
let syncedCache: { at: number; value: boolean } | null = null;
export async function hasSyncedCatalog() {
  if (syncedCache && Date.now() - syncedCache.at < BOUNDS_TTL) return syncedCache.value;
  try {
    const { count } = await db().from("market_skins").select("id", { count: "exact", head: true }).eq("active", true);
    const value = (count ?? 0) > 0;
    syncedCache = { at: Date.now(), value };
    return value;
  } catch {
    return false;
  }
}
