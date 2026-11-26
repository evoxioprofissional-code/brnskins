import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryId, RarityId, VariantType } from "@/types/catalog";
import { WEARS } from "@/config/catalog";
import { CATALOG_BASE_URL, MARKET_SOURCES, PRICE_BASE_URL, extractUsd, fetchJson, type MarketSource } from "./sources";

/** Item do catálogo aberto (formato comum aos arquivos do ByMykel). */
interface SourceItem {
  id: string;
  name: string;
  market_hash_name?: string | null;
  weapon?: { name: string };
  category?: { name: string };
  pattern?: { name: string } | null;
  rarity?: { id: string } | null;
  image?: string | null;
  min_float?: number | null;
  max_float?: number | null;
  stattrak?: boolean;
  souvenir?: boolean;
  wears?: { name: string }[];
  marketable?: boolean;
}

/** Arquivos do catálogo e a categoria da loja de cada um. */
const EXTRA_FILES: { file: string; category: CategoryId; stattrak?: boolean }[] = [
  { file: "agents", category: "agent" },
  { file: "stickers", category: "sticker" },
  { file: "crates", category: "case" },
  { file: "keys", category: "case" },
  { file: "graffiti", category: "graffiti" },
  { file: "music_kits", category: "music", stattrak: true },
  { file: "patches", category: "patch" },
  { file: "keychains", category: "charm" },
];

const SNIPERS = new Set(["AWP", "SSG 08", "SCAR-20", "G3SG1"]);
const WEAPON_GROUP: Record<string, CategoryId> = {
  Rifles: "rifle",
  Pistols: "pistol",
  SMGs: "smg",
  Heavy: "heavy",
  Knives: "knife",
  Gloves: "gloves",
  Equipment: "equipment",
};
const RARITY: Record<string, RarityId> = {
  rarity_default: "consumer",
  rarity_common: "consumer",
  rarity_common_weapon: "consumer",
  rarity_uncommon: "industrial",
  rarity_uncommon_weapon: "industrial",
  rarity_rare: "milspec",
  rarity_rare_weapon: "milspec",
  rarity_rare_character: "milspec",
  rarity_mythical: "restricted",
  rarity_mythical_weapon: "restricted",
  rarity_mythical_character: "restricted",
  rarity_legendary: "classified",
  rarity_legendary_weapon: "classified",
  rarity_legendary_character: "classified",
  rarity_ancient: "covert",
  rarity_ancient_weapon: "covert",
  rarity_ancient_character: "master",
  rarity_contraband: "contraband",
  rarity_contraband_weapon: "contraband",
};
const WEAR_CODE = new Map(WEARS.map((w) => [w.name, w.code]));
const NO_WEAR = "-";

/** Nome no mercado de uma combinação (ex.: "★ StatTrak™ Karambit | Doppler (Factory New)"). */
export function marketHashName(baseName: string, wearName: string | null, variant: VariantType) {
  const full = wearName ? `${baseName} (${wearName})` : baseName;
  if (variant === "stattrak") return full.startsWith("★ ") ? `★ StatTrak™ ${full.slice(2)}` : `StatTrak™ ${full}`;
  if (variant === "souvenir") return `Souvenir ${full}`;
  return full;
}

/** "Sticker | Shooter" → ["Sticker", "Shooter"]; "Gift Package" → ["Gift Package", ""] */
const splitName = (name: string) => {
  const clean = name.replace(/^★ /, "");
  const i = clean.indexOf(" | ");
  return i === -1 ? [clean, ""] : [clean.slice(0, i), clean.slice(i + 3)];
};

export interface SyncResult {
  skins: number;
  offers: number;
  priced: number;
  usdBrl: number;
  sources: Record<MarketSource, number>;
  byCategory: Record<string, number>;
  finishedAt: string;
  durationMs: number;
}

async function upsertInBatches(db: SupabaseClient, table: string, rows: object[], onConflict: string, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + size), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/**
 * Baixa catálogo + preços, grava no Supabase e recalcula o preço de venda.
 * Chamado pela rota /api/cron/catalog-sync e pelo botão do admin.
 */
export async function syncMarketCatalog(db: SupabaseClient): Promise<SyncResult> {
  const started = Date.now();
  const [skinsFile, extraFiles, rates, priceFiles] = await Promise.all([
    fetchJson<SourceItem[]>(`${CATALOG_BASE_URL}/skins.json`),
    Promise.all(EXTRA_FILES.map((f) => fetchJson<SourceItem[] | Record<string, SourceItem>>(`${CATALOG_BASE_URL}/${f.file}.json`).catch(() => []))),
    fetchJson<Record<string, number>>(`${PRICE_BASE_URL}/exchange_rates.json`),
    Promise.all(MARKET_SOURCES.map((s) => fetchJson<Record<string, unknown>>(`${PRICE_BASE_URL}/${s}.json`).catch(() => ({})))),
  ]);
  const prices = Object.fromEntries(MARKET_SOURCES.map((s, i) => [s, priceFiles[i] ?? {}])) as Record<MarketSource, Record<string, unknown>>;
  const usdBrl = Number(rates.BRL);
  if (!Number.isFinite(usdBrl) || usdBrl <= 0) throw new Error("Cotação do dólar indisponível");

  const now = new Date().toISOString();
  const skinRows: object[] = [];
  const offerRows: object[] = [];
  const perSource = Object.fromEntries(MARKET_SOURCES.map((s) => [s, 0])) as Record<MarketSource, number>;
  const byCategory: Record<string, number> = {};
  const seen = new Set<string>(); // fases de Doppler e duplicatas usam o mesmo nome
  let priced = 0;

  const priceOf = (name: string) => {
    const usd: Partial<Record<MarketSource, number>> = {};
    for (const src of MARKET_SOURCES) {
      const v = extractUsd(src, prices[src][name]);
      if (v !== null) {
        usd[src] = Math.round(v * 100) / 100;
        perSource[src]++;
      }
    }
    return Object.keys(usd).length ? usd : null;
  };

  const addItem = (item: {
    id: string;
    name: string;
    category: CategoryId;
    rarity: RarityId;
    image: string;
    variants: VariantType[];
    wears: (string | null)[]; // nomes de condição; [null] = item sem condição
    minFloat?: number | null;
    maxFloat?: number | null;
  }) => {
    if (seen.has(item.name)) return;
    seen.add(item.name);
    const offers: object[] = [];
    for (const wearName of item.wears) {
      const wear = wearName ? WEAR_CODE.get(wearName) : NO_WEAR;
      if (!wear) continue;
      for (const variant of item.variants) {
        const name = marketHashName(item.name, wearName, variant);
        const usd = priceOf(name);
        if (!usd) continue;
        offers.push({ skin_id: item.id, wear, variant, market_hash_name: name, usd, synced_at: now });
      }
    }
    if (!offers.length) return;
    priced += offers.length;
    offerRows.push(...offers);
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    const [weapon, finish] = splitName(item.name);
    skinRows.push({
      id: item.id,
      market_name: item.name,
      weapon,
      finish,
      is_star: item.name.startsWith("★"),
      category_id: item.category,
      rarity_id: item.rarity,
      image_url: item.image,
      min_float: item.minFloat ?? null,
      max_float: item.maxFloat ?? null,
      stattrak: item.variants.includes("stattrak"),
      souvenir: item.variants.includes("souvenir"),
      has_wear: item.wears.some(Boolean),
      active: true,
      synced_at: now,
    });
  };

  // Armas, facas (inclusive vanilla), luvas e Zeus
  for (const s of skinsFile) {
    let category = WEAPON_GROUP[s.category?.name ?? ""];
    if (category === "rifle" && SNIPERS.has(s.weapon?.name ?? "")) category = "sniper";
    if (!category || !s.image) continue;
    addItem({
      id: s.id,
      name: s.name,
      category,
      rarity: (s.rarity && RARITY[s.rarity.id]) || "covert",
      image: s.image,
      variants: ["normal", ...(s.stattrak ? (["stattrak"] as const) : []), ...(s.souvenir ? (["souvenir"] as const) : [])],
      wears: s.wears?.length ? s.wears.map((w) => w.name) : [null],
      minFloat: s.min_float,
      maxFloat: s.max_float,
    });
  }

  // Agentes, adesivos, caixas, chaves, grafites, kits de música, patches e chaveiros
  EXTRA_FILES.forEach((f, i) => {
    const raw = extraFiles[i] ?? [];
    const list = Array.isArray(raw) ? raw : Object.values(raw);
    for (const it of list) {
      const name = it.market_hash_name || it.name;
      if (!name || !it.image || it.marketable === false) continue;
      addItem({
        id: it.id,
        name,
        category: f.category,
        rarity: (it.rarity && RARITY[it.rarity.id]) || "consumer",
        image: it.image,
        variants: f.stattrak ? ["normal", "stattrak"] : ["normal"],
        wears: [null],
      });
    }
  });

  if (!skinRows.length) throw new Error("Nenhum item com preço encontrado nas fontes");

  await upsertInBatches(db, "market_skins", skinRows, "id", 500);
  await upsertInBatches(db, "market_offers", offerRows, "skin_id,wear,variant", 1000);
  // Itens que sumiram das fontes: saem da loja, mas ficam no banco.
  await db.from("market_skins").update({ active: false }).lt("synced_at", now);
  await db.from("market_offers").delete().lt("synced_at", now);

  const { data: cfg } = await db.from("settings").select("value").eq("key", "pricing").maybeSingle();
  const usdCny = Number(rates.CNY);
  const pricing = {
    source: "buff163",
    margin_pct: 8,
    ...(cfg?.value ?? {}),
    usd_brl: Math.round(usdBrl * 10000) / 10000,
    // Cotação do yuan (BUFF e C5 vendem em ¥): usada no modo "¥ × cotação" e no cotador
    ...(Number.isFinite(usdCny) && usdCny > 0 ? { usd_cny: Math.round(usdCny * 10000) / 10000 } : {}),
  };
  await db.from("settings").upsert({ key: "pricing", value: pricing, is_public: false });
  const { error: repriceError } = await db.rpc("reprice_market_offers");
  if (repriceError) throw new Error(`reprice: ${repriceError.message}`);

  const result: SyncResult = {
    skins: skinRows.length,
    offers: offerRows.length,
    priced,
    usdBrl: pricing.usd_brl,
    sources: perSource,
    byCategory,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
  };
  await db.from("settings").upsert({ key: "catalog_sync", value: result, is_public: false });
  return result;
}
