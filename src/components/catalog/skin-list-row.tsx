"use client";

import Image from "next/image";
import { memo } from "react";
import { ChevronRight, Star } from "lucide-react";
import type { Skin } from "@/types/catalog";
import { getCategory, getRarity } from "@/config/catalog";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { discountPercent, getOffer, skinDisplayName, wearName } from "@/lib/skin";
import { DiscountPill } from "@/components/product/discount-pill";

export const SkinListRow = memo(function SkinListRow({
  skin,
  selected,
  favorite,
  onOpen,
  onToggleFavorite,
}: {
  skin: Skin;
  selected: boolean;
  favorite: boolean;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const offer = getOffer(skin);
  const rarity = getRarity(skin.rarity);
  const name = skinDisplayName(skin);
  return (
    <div
      className={cn(
        "relative flex h-[68px] items-center gap-3 rounded-[10px] border pl-2 pr-3 transition-colors",
        selected ? "border-[#ff2747]/90 bg-[#14070a]" : "border-[#18191d] bg-[#0b0c0e] hover:border-[#2a2b31]",
      )}
    >
      <button type="button" onClick={() => onOpen(skin.id)} aria-label={`Ver detalhes de ${name}`} className="absolute inset-0 rounded-[10px]" />
      <div
        className="pointer-events-none relative h-[52px] w-[78px] shrink-0 rounded-[8px]"
        style={{ background: `radial-gradient(closest-side, ${rarity?.color ?? "#e60023"}30, transparent)` }}
      >
        <Image src={skin.image} alt="" fill sizes="78px" className="object-contain" />
      </div>
      <div className="pointer-events-none min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold">{name}</p>
        <p className="truncate text-[12px] text-fg-2/80">
          <span className="font-semibold text-primary">{getCategory(skin.category)?.label}</span> · {skin.noWear ? "Item" : wearName(offer.wear)} ·{" "}
          <span style={{ color: rarity?.color }}>{rarity?.name}</span>
        </p>
      </div>
      <div className="pointer-events-none hidden sm:block">
        <DiscountPill percent={discountPercent(offer)} />
      </div>
      <span className="pointer-events-none w-[110px] text-right text-[15px] font-bold">{formatBRL(offer.price)}</span>
      <button
        type="button"
        onClick={() => onToggleFavorite(skin.id)}
        aria-pressed={favorite}
        aria-label={favorite ? "Remover dos favoritos" : "Favoritar"}
        className="relative z-10 grid size-8 place-items-center rounded-md text-fg-2 hover:text-fg"
      >
        <Star size={16} className={cn(favorite && "fill-primary text-primary")} />
      </button>
      <ChevronRight size={16} className="pointer-events-none hidden text-fg-2 sm:block" />
    </div>
  );
});
