import type { Skin, VariantType, WearCode } from "@/types/catalog";
import { UPGRADE } from "@/config/upgrade";
import { WEARS } from "@/config/catalog";
import { profileUrl } from "@/integrations/steam/trade-link";
import type { OfferItem, SteamAccount, UpgradePick } from "@/stores/upgrade-store";
import { formatBRL } from "./format";
import { getOffer, priceFor, skinDisplayName, variantLabel, wearName } from "./skin";

/** Preço de referência (catálogo) de uma skin escolhida. */
export function pickPrice(skin: Skin, pick: UpgradePick) {
  return priceFor(getOffer(skin, pick.wear), pick.variant);
}

export const tradeInValue = (reference: number) => Math.round(reference * UPGRADE.tradeInRate * 100) / 100;

const WEAR_BY_NAME = new Map(WEARS.map((w) => [w.name, w.code]));

/** "★ StatTrak™ Karambit | Doppler (Factory New)" → base, condição e variação. */
export function parseMarketHashName(name: string): { base: string; wear: WearCode | null; variant: VariantType } {
  let base = name.trim();
  let wear: WearCode | null = null;
  const m = base.match(/^(.*) \(([^()]+)\)$/);
  if (m && WEAR_BY_NAME.has(m[2]!)) {
    base = m[1]!;
    wear = WEAR_BY_NAME.get(m[2]!)!;
  }
  let variant: VariantType = "normal";
  if (base.includes("StatTrak™ ")) {
    variant = "stattrak";
    base = base.replace("StatTrak™ ", "");
  } else if (base.startsWith("Souvenir ")) {
    variant = "souvenir";
    base = base.slice("Souvenir ".length);
  }
  return { base, wear, variant };
}

export interface ResolvedOffer {
  item: OfferItem;
  /** Skin do catálogo com o mesmo nome e condição, quando existir */
  match?: { skin: Skin; pick: UpgradePick };
  reference: number;
  /** 0 quando não há referência — o item fica "a avaliar" */
  estimate: number;
}

/** Estima cada item do inventário pelo preço do mesmo item no catálogo da loja. */
export function resolveOffer(items: OfferItem[], skins: Skin[]): ResolvedOffer[] {
  const byName = new Map(skins.map((s) => [s.marketName, s]));
  return items.map((item) => {
    const { base, wear, variant } = parseMarketHashName(item.marketHashName);
    const skin = byName.get(base);
    const offer = skin && wear ? skin.offers.find((o) => o.wear === wear) : undefined;
    if (!skin || !wear || !offer) return { item, reference: 0, estimate: 0 };
    const reference = priceFor(offer, variant);
    return { item, match: { skin, pick: { skinId: skin.id, wear, variant } }, reference, estimate: tradeInValue(reference) };
  });
}

export interface UpgradeQuote {
  offerValue: number;
  targetPrice: number;
  /** 0..1+ — quanto do alvo as skins entregues cobrem */
  coverage: number;
  /** alvo ÷ valor entregue */
  multiplier: number;
  /** positivo = cliente paga; negativo = sobra crédito */
  difference: number;
  pending: number;
}

export function quote(resolved: ResolvedOffer[], targetPrice: number): UpgradeQuote {
  const offerValue = resolved.reduce((sum, r) => sum + r.estimate, 0);
  return {
    offerValue,
    targetPrice,
    coverage: targetPrice > 0 ? offerValue / targetPrice : 0,
    multiplier: offerValue > 0 && targetPrice > 0 ? targetPrice / offerValue : 0,
    difference: Math.round((targetPrice - offerValue) * 100) / 100,
    pending: resolved.filter((r) => !r.match).length,
  };
}

export interface Suggestion {
  skin: Skin;
  pick: UpgradePick;
  price: number;
  multiplier: number;
}

/**
 * Alvos cujo preço fica próximo de `valor × multiplicador` (sempre acima do valor
 * entregue). Sem skins oferecidas, devolve os destaques do catálogo.
 */
export function suggestTargets(skins: Skin[], offerValue: number, multiplier: number, excludeIds: string[]): Suggestion[] {
  const pool = skins.filter((s) => !excludeIds.includes(s.id));
  if (offerValue <= 0) {
    return [...pool]
      .sort((a, b) => a.featuredRank - b.featuredRank)
      .slice(0, UPGRADE.suggestionCount)
      .map((skin) => {
        const offer = getOffer(skin);
        return { skin, pick: { skinId: skin.id, wear: offer.wear, variant: "normal" }, price: offer.price, multiplier: 0 };
      });
  }
  const goal = offerValue * multiplier;
  const scored: (Suggestion & { score: number })[] = [];
  for (const skin of pool) {
    let best: (Suggestion & { score: number }) | null = null;
    for (const offer of skin.offers) {
      if (!offer.available || offer.price <= offerValue) continue;
      const score = Math.abs(Math.log(offer.price / goal));
      if (!best || score < best.score)
        best = {
          skin,
          pick: { skinId: skin.id, wear: offer.wear, variant: "normal" },
          price: offer.price,
          multiplier: offer.price / offerValue,
          score,
        };
    }
    if (best) scored.push(best);
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, UPGRADE.suggestionCount);
}

export const formatMultiplier = (m: number) =>
  `x${m >= 10 ? Math.round(m) : m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`;

const pickLabel = (skin: Skin, pick: UpgradePick) =>
  `${skinDisplayName(skin)}${pick.variant !== "normal" ? ` ${variantLabel(pick.variant)}` : ""} (${wearName(pick.wear)})`;

export function buildUpgradeMessage(
  account: SteamAccount | null,
  resolved: ResolvedOffer[],
  target: { skin: Skin; pick: UpgradePick } | null,
  q: UpgradeQuote,
  meta: { reference?: string; referral?: string | null } = {},
) {
  const give = resolved.map(
    (r) =>
      `• ${r.item.marketHashName} — ${r.match ? `estimativa ${formatBRL(r.estimate)}` : "a avaliar"} (asset ${r.item.assetId})`,
  );
  return [
    "Olá, BRN Skins! Quero fazer um upgrade.",
    meta.reference ? `Pedido: ${meta.reference}` : null,
    meta.referral ? `Indicação: ${meta.referral}` : null,
    "",
    account ? `Steam: ${profileUrl(account.steamId)}` : null,
    account?.tradeLink ? `Trade link: ${account.tradeLink}` : null,
    account ? "" : null,
    "Vou entregar (do meu inventário):",
    ...give,
    `Estimativa: ${formatBRL(q.offerValue)}${q.pending ? ` + ${q.pending} item(ns) a avaliar` : ""}`,
    "",
    "Quero receber:",
    target ? `• ${pickLabel(target.skin, target.pick)} — ${formatBRL(q.targetPrice)}` : "• Ainda vou escolher, me ajudem a decidir",
    "",
    target
      ? q.difference > 0
        ? `Diferença estimada a pagar: ${formatBRL(q.difference)}${q.pending ? " (antes da avaliação dos itens pendentes)" : ""}`
        : `Crédito estimado a meu favor: ${formatBRL(-q.difference)}`
      : null,
    "Sei que os valores são estimativas e dependem da avaliação de vocês.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}
