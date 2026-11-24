import type { Skin } from "@/types/catalog";
import { UPGRADE } from "@/config/upgrade";
import type { OfferItem, UpgradePick } from "@/stores/upgrade-store";
import { formatBRL } from "./format";
import { getOffer, priceFor, skinDisplayName, variantLabel, wearName } from "./skin";

type GetSkin = (id: string) => Skin | undefined;

/** Preço de referência (catálogo) de uma skin escolhida. */
export function pickPrice(skin: Skin, pick: UpgradePick) {
  return priceFor(getOffer(skin, pick.wear), pick.variant);
}

export const tradeInValue = (reference: number) => Math.round(reference * UPGRADE.tradeInRate * 100) / 100;

export interface ResolvedOffer {
  item: OfferItem;
  skin?: Skin;
  reference: number;
  estimate: number;
}

export function resolveOffer(items: OfferItem[], getSkin: GetSkin): ResolvedOffer[] {
  return items.map((item) => {
    if (item.kind === "custom") return { item, reference: 0, estimate: 0 };
    const skin = getSkin(item.skinId);
    if (!skin) return { item, reference: 0, estimate: 0 };
    const reference = pickPrice(skin, item);
    return { item, skin, reference, estimate: tradeInValue(reference) };
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
  pendingCustom: number;
}

export function quote(resolved: ResolvedOffer[], targetPrice: number): UpgradeQuote {
  const offerValue = resolved.reduce((sum, r) => sum + r.estimate, 0);
  return {
    offerValue,
    targetPrice,
    coverage: targetPrice > 0 ? offerValue / targetPrice : 0,
    multiplier: offerValue > 0 && targetPrice > 0 ? targetPrice / offerValue : 0,
    difference: Math.round((targetPrice - offerValue) * 100) / 100,
    pendingCustom: resolved.filter((r) => r.item.kind === "custom").length,
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

export function buildUpgradeMessage(resolved: ResolvedOffer[], target: { skin: Skin; pick: UpgradePick } | null, q: UpgradeQuote) {
  const give = resolved.map((r) =>
    r.item.kind === "custom"
      ? `• ${r.item.name} — a avaliar`
      : r.skin
        ? `• ${pickLabel(r.skin, r.item)} — estimativa ${formatBRL(r.estimate)}`
        : null,
  );
  return [
    "Olá, BRN Skins! Quero fazer um upgrade.",
    "",
    "Vou entregar:",
    ...give.filter(Boolean),
    `Estimativa das minhas skins: ${formatBRL(q.offerValue)}${q.pendingCustom ? ` + ${q.pendingCustom} item(ns) a avaliar` : ""}`,
    "",
    "Quero receber:",
    target ? `• ${pickLabel(target.skin, target.pick)} — ${formatBRL(q.targetPrice)}` : "• Ainda vou escolher, me ajudem a decidir",
    "",
    target
      ? q.difference > 0
        ? `Diferença estimada a pagar: ${formatBRL(q.difference)}`
        : `Crédito estimado a meu favor: ${formatBRL(-q.difference)}`
      : null,
    "Sei que os valores são estimativas e dependem da avaliação de vocês.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}
