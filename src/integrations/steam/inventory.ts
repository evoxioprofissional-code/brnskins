import type { InventoryResult, SteamInventoryItem } from "./types";

/**
 * Inventário público de CS2 (appid 730, contexto 2) pelo endpoint da
 * comunidade Steam. Não usa chave; só funciona com inventário público.
 * Chamado apenas no servidor (o endpoint não permite CORS).
 */
const ENDPOINT = (steamId: string, startAssetId?: string) =>
  `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=1000${
    startAssetId ? `&start_assetid=${startAssetId}` : ""
  }`;
const IMAGE_BASE = "https://community.akamai.steamstatic.com/economy/image/";
const MAX_PAGES = 3;

interface RawTag {
  category: string;
  internal_name: string;
  localized_tag_name: string;
  color?: string;
}
interface RawDescription {
  classid: string;
  instanceid: string;
  market_hash_name: string;
  name: string;
  icon_url: string;
  tradable: number;
  marketable: number;
  name_color?: string;
  tags?: RawTag[];
}
interface RawAsset {
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
}
interface RawInventory {
  success?: number;
  assets?: RawAsset[];
  descriptions?: RawDescription[];
  more_items?: number;
  last_assetid?: string;
  total_inventory_count?: number;
}

const tag = (d: RawDescription, category: string) => d.tags?.find((t) => t.category === category);

export async function fetchSteamInventory(steamId: string): Promise<InventoryResult> {
  const assets: RawAsset[] = [];
  const descriptions = new Map<string, RawDescription>();
  let start: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT(steamId, start), {
        headers: { Accept: "application/json" },
        next: { revalidate: 120 },
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      return { ok: false, code: "unavailable" };
    }
    if (res.status === 403) return { ok: false, code: "private" };
    if (res.status === 429) return { ok: false, code: "rate_limited" };
    if (!res.ok) return { ok: false, code: page === 0 ? "unavailable" : "partial_failure" };

    let data: RawInventory | null;
    try {
      data = (await res.json()) as RawInventory | null;
    } catch {
      return { ok: false, code: "unavailable" };
    }
    // Inventário vazio: a Steam devolve success=1 sem assets (ou null).
    if (!data || !data.assets) break;
    assets.push(...data.assets);
    for (const d of data.descriptions ?? []) descriptions.set(`${d.classid}_${d.instanceid}`, d);
    if (!data.more_items || !data.last_assetid) break;
    start = data.last_assetid;
  }

  const items: SteamInventoryItem[] = [];
  for (const a of assets) {
    const d = descriptions.get(`${a.classid}_${a.instanceid}`);
    if (!d || !d.marketable) continue; // itens não comercializáveis (medalhas, moedas) não entram
    const rarity = tag(d, "Rarity");
    items.push({
      assetId: a.assetid,
      marketHashName: d.market_hash_name,
      name: d.name,
      image: `${IMAGE_BASE}${d.icon_url}/330x192`,
      tradable: d.tradable === 1,
      type: tag(d, "Type")?.localized_tag_name ?? "",
      exterior: tag(d, "Exterior")?.localized_tag_name ?? null,
      rarityColor: rarity?.color ? `#${rarity.color}` : null,
    });
  }
  return { ok: true, items };
}
