"use client";

import Image from "next/image";
import { memo } from "react";
import { ChevronRight, Star, Zap } from "lucide-react";
import type { Skin } from "@/types/catalog";
import { WEARS, WEAR_COLORS, getCategory, getRarity } from "@/config/catalog";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { discountPercent, getOffer, minPrice, skinDisplayName } from "@/lib/skin";

interface SkinCardProps {
  skin: Skin;
  selected: boolean;
  favorite: boolean;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  priority?: boolean;
}

const VARIANT_TAG = {
  normal: { label: "Normal", className: "bg-[#1c1d22] text-fg-2 border-[#2a2b31]" },
  stattrak: { label: "ST™", className: "bg-[#cf6a32]/15 text-[#ff9a5c] border-[#cf6a32]/50" },
  souvenir: { label: "SV", className: "bg-[#ffd700]/10 text-[#ffd84d] border-[#ffd700]/40" },
} as const;

export const SkinCard = memo(function SkinCard({
  skin,
  selected,
  favorite,
  onOpen,
  onToggleFavorite,
  priority,
}: SkinCardProps) {
  const rarity = getRarity(skin.rarity);
  const category = getCategory(skin.category);
  const name = skinDisplayName(skin);
  const fromPrice = minPrice(skin);
  const discount = discountPercent(getOffer(skin));
  const available = new Set(skin.offers.filter((o) => o.available).map((o) => o.wear));
  const offerCount = available.size * skin.variants.length;
  const rarityColor = rarity?.color ?? "#e60023";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[12px] border transition-[border-color,box-shadow,transform] duration-200",
        selected
          ? "border-[#ff2747]/90 shadow-[0_0_0_1px_rgb(230_0_35/0.25),0_0_22px_-4px_rgb(230_0_35/0.6)]"
          : "border-[#18191d] hover:-translate-y-[2px] hover:border-[#2c2d33] hover:shadow-[0_14px_30px_-18px_rgb(0_0_0/0.9)]",
      )}
      style={{
        background: selected
          ? "linear-gradient(180deg, #14070a 0%, #0b0708 100%)"
          : "linear-gradient(180deg, #0d0e11 0%, #090a0c 100%)",
      }}
    >
      {/* Área clicável principal */}
      <button
        type="button"
        onClick={() => onOpen(skin.id)}
        aria-label={`Ver detalhes de ${name}`}
        className="absolute inset-0 z-0 rounded-[12px]"
      />

      {/* Nome + condições disponíveis */}
      <header className="pointer-events-none relative px-[11px] pt-[10px]">
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="line-clamp-2 min-h-[32px] text-[12.5px] font-semibold leading-[16px] text-fg">{name}</h3>
          <button
            type="button"
            onClick={() => onToggleFavorite(skin.id)}
            aria-pressed={favorite}
            aria-label={favorite ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
            className="pointer-events-auto relative z-10 -mr-[5px] -mt-[4px] grid size-[24px] shrink-0 place-items-center rounded-md text-fg-2 transition-colors hover:text-white"
          >
            <Star size={15} strokeWidth={1.9} className={cn(favorite && "fill-primary text-primary")} />
          </button>
        </div>
        <div className="mt-[4px] flex items-center justify-between gap-2">
        <ul className="mt-[3px] flex gap-[6px] text-[10px] font-bold leading-none" aria-label="Condições disponíveis">
          {WEARS.map((w) => {
            const on = available.has(w.code);
            return (
              <li
                key={w.code}
                title={`${w.name}${on ? "" : " (indisponível)"}`}
                style={{ color: on ? WEAR_COLORS[w.code] : "#34353b" }}
              >
                {w.code}
              </li>
            );
          })}
        </ul>
        <span className="rounded-[4px] bg-[linear-gradient(180deg,#e3082a,#b5001b)] px-[5px] py-[2px] text-[9px] font-bold leading-[10px] tracking-[0.03em] text-white">
          {category?.badge}
        </span>
        </div>
      </header>

      {/* Imagem */}
      <div className="pointer-events-none relative mx-[6px] mt-[4px] h-[112px]">
        <div
          aria-hidden
          className="absolute inset-x-[10%] bottom-[6px] top-[10%] rounded-full opacity-70 blur-[22px] transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(closest-side, ${rarityColor}40, transparent)` }}
        />
        <Image
          src={skin.image}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 200px, 45vw"
          className="object-contain p-[6px] drop-shadow-[0_8px_12px_rgb(0_0_0/0.6)] transition-transform duration-300 group-hover:scale-[1.05]"
        />
        {discount > 0 && (
          <span className="absolute bottom-[2px] left-[5px] rounded-[4px] border border-[#14532d]/70 bg-[#0b2a17] px-[5px] py-[2px] text-[9.5px] font-bold leading-[11px] text-[#3ee07a]">
            -{discount}%
          </span>
        )}
        <div className="absolute bottom-[2px] right-[5px] flex gap-[3px]">
          {skin.variants.map((v) => (
            <span
              key={v}
              className={cn(
                "rounded-[4px] border px-[5px] py-[2px] text-[9.5px] font-bold leading-[11px]",
                VARIANT_TAG[v].className,
              )}
            >
              {VARIANT_TAG[v].label}
            </span>
          ))}
        </div>
      </div>

      {/* Linha de raridade */}
      <div
        aria-hidden
        className="mx-[11px] mt-[8px] h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${rarityColor}66, transparent)` }}
      />

      {/* Preço */}
      <div className="pointer-events-none relative px-[11px] pt-[7px]">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.07em] text-faint">A partir de</p>
        <div className="mt-[1px] flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-bold leading-[20px] tracking-[-0.01em]">{formatBRL(fromPrice)}</span>
          <span
            className="flex h-[18px] shrink-0 items-center gap-[3px] rounded-[5px] bg-white/[0.04] px-[6px] text-[10.5px] font-semibold text-fg-2"
            title="Prazo estimado de entrega"
          >
            <Zap size={10} strokeWidth={2.4} className="text-primary" />
            {skin.deliveryEstimate}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(skin.id)}
        tabIndex={-1}
        aria-hidden
        className={cn(
          "relative z-10 mx-[11px] mb-[11px] mt-[9px] flex h-[30px] items-center justify-center gap-[4px] rounded-[8px] text-[12px] font-semibold transition-colors",
          selected
            ? "btn-outline-red text-white"
            : "border border-[#1f2026] bg-[#121317] text-fg-2 group-hover:border-primary/60 group-hover:bg-[#1a0a0d] group-hover:text-white",
        )}
      >
        Ver {offerCount} {offerCount === 1 ? "oferta" : "ofertas"}
        <ChevronRight size={14} strokeWidth={2.2} />
      </button>
    </article>
  );
});
