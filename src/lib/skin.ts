import type { Skin, VariantType, WearCode, WearOffer } from "@/types/catalog";
import { VARIANT_LABELS, getWear } from "@/config/catalog";

export const skinDisplayName = (skin: Pick<Skin, "weapon" | "finish" | "isStar">) =>
  `${skin.isStar ? "★ " : ""}${skin.weapon} | ${skin.finish}`;

export function getOffer(skin: Skin, wear?: WearCode): WearOffer {
  const target = wear ?? skin.defaultWear;
  return skin.offers.find((o) => o.wear === target) ?? skin.offers[0]!;
}

/** Desconto inteiro em relação à Steam (ex.: 11 para -11%). */
export const discountPercent = (offer: Pick<WearOffer, "price" | "steamPrice">) =>
  offer.steamPrice > offer.price ? Math.round((1 - offer.price / offer.steamPrice) * 100) : 0;

export const wearName = (code: WearCode) => getWear(code).name;

export const variantLabel = (v: VariantType) => VARIANT_LABELS[v];

/** Multiplicador demonstrativo aplicado a variações especiais. */
export const VARIANT_PRICE_FACTOR: Record<VariantType, number> = {
  normal: 1,
  stattrak: 1.35,
  souvenir: 1.6,
};

export const priceFor = (offer: WearOffer, variant: VariantType) =>
  Math.round(offer.price * VARIANT_PRICE_FACTOR[variant] * 100) / 100;

export const minPrice = (skin: Skin) => Math.min(...skin.offers.map((o) => o.price));
