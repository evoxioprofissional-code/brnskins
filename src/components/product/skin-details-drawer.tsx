"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Box, ChevronRight, Gamepad2, PackageOpen, ShoppingCart, Star, X } from "lucide-react";
import type { Skin, VariantType, WearCode } from "@/types/catalog";
import { getCategory, getRarity, VARIANT_LABELS, WEARS, WEAR_COLORS } from "@/config/catalog";
import { cn } from "@/lib/cn";
import { formatBRL, formatFloat } from "@/lib/format";
import { discountPercent, getOffer, priceFor, skinDisplayName, wearName } from "@/lib/skin";
import { useCatalogStore } from "@/stores/catalog-store";
import { useCartStore } from "@/stores/cart-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useCatalogData } from "@/components/catalog/catalog-data-provider";
import { useOpenWhatsApp } from "@/components/catalog/tab-panels";
import { toast } from "@/components/ui/toaster";
import { DRAWER_WIDTH } from "@/config/layout";
import { DiscountPill } from "./discount-pill";
import { QuantityStepper } from "./quantity-stepper";

function DrawerBody({ skin, onClose }: { skin: Skin; onClose: () => void }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const addToCart = useCartStore((s) => s.add);
  const isFav = useFavoritesStore((s) => s.ids.includes(skin.id));
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const showSteam = useSettingsStore((s) => s.store.showSteamComparison);
  const openWhatsApp = useOpenWhatsApp();

  const [wear, setWear] = useState<WearCode>(skin.defaultWear);
  const [variant, setVariant] = useState<VariantType>("normal");
  const [qty, setQty] = useState(1);

  const offer = getOffer(skin, wear);
  const unitPrice = priceFor(offer, variant);
  const steamPrice = priceFor({ ...offer, price: offer.steamPrice }, variant);
  const discount = discountPercent(offer);
  const rarity = getRarity(skin.rarity);
  const category = getCategory(skin.category);
  const name = skinDisplayName(skin);
  const total = Math.round(unitPrice * qty * 100) / 100;

  const add = () => {
    addToCart({
      kind: "skin",
      key: `${skin.id}:${wear}:${variant}`,
      skinId: skin.id,
      name,
      image: skin.image,
      wear,
      variant,
      unitPrice,
      quantity: qty,
    });
    toast(`${name} adicionada ao carrinho`);
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Cabeçalho */}
      <div className="sticky top-0 z-10 flex h-[58px] shrink-0 items-center justify-between border-b border-[#16171b] bg-[#070709]/95 pl-[21px] pr-[12px] backdrop-blur lg:h-[67px]">
        <h2 className="flex items-center gap-[9px] text-[15px] font-bold uppercase tracking-[0.005em]">
          <PackageOpen size={18} strokeWidth={2} aria-hidden />
          Detalhes da skin
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar detalhes"
          className="grid size-[34px] place-items-center rounded-full bg-white/[0.04] text-fg transition-colors hover:bg-white/[0.08]"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Imagem */}
      <div className="relative h-[200px] shrink-0 overflow-hidden bg-[radial-gradient(60%_75%_at_58%_48%,rgb(120_10_32/0.75)_0%,rgb(60_6_18/0.55)_45%,transparent_80%)] lg:h-[165px]">
        <div className="absolute inset-x-[20px] bottom-[22px] top-[20px]">
          <Image src={skin.image} alt={name} fill sizes="392px" priority className="object-contain drop-shadow-[0_10px_22px_rgb(0_0_0/0.6)]" />
        </div>
        <span
          className="absolute bottom-[10px] left-[21px] rounded-[5px] px-[7px] py-[2px] text-[12px] font-bold leading-[14px] text-white"
          style={{ background: wear === "FN" ? "#15803d" : `${WEAR_COLORS[wear]}cc` }}
        >
          {wear}
        </span>
        <Link
          href={`/inspect?${new URLSearchParams({
            skin: skin.id,
            wear: String(offer.float),
            ...(variant === "stattrak" ? { st: "1" } : {}),
          }).toString()}`}
          className="absolute bottom-[8px] right-[16px] inline-flex h-[26px] items-center gap-[6px] rounded-[7px] border border-white/15 bg-black/55 px-[9px] text-[11.5px] font-semibold text-white backdrop-blur transition-colors hover:border-primary/70 hover:bg-primary/20"
        >
          <Box size={14} strokeWidth={2} /> Inspecionar 3D
        </Link>
      </div>

      <div className="flex flex-1 flex-col px-[16px] pb-[16px] lg:px-[21px] lg:pb-[28px]">
        {/* Nome / raridade */}
        <div className="mt-[8px] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold leading-[22px] tracking-[-0.01em]">{name}</h3>
            <p className="mt-[2px] text-[12.5px] leading-[16px]" style={{ color: "#ff3b4f" }}>
              {rarity?.name} ({category?.label})
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleFav(skin.id)}
            aria-pressed={hydrated && isFav}
            aria-label={isFav ? "Remover dos favoritos" : "Favoritar"}
            className="-mr-1 mt-[-2px] grid size-8 place-items-center rounded-md text-fg"
          >
            <Star size={21} strokeWidth={1.8} className={cn(hydrated && isFav && "fill-primary text-primary")} />
          </button>
        </div>

        {/* Preço */}
        <div className="mt-[11px] flex items-center gap-[19px]">
          <span className="text-[23px] font-bold leading-[28px] tracking-[-0.015em]">{formatBRL(unitPrice)}</span>
          <DiscountPill percent={discount} size="md" direction="down" />
        </div>
        {showSteam && (
          <p className="mt-[4px] text-[12px] leading-[16px] text-fg-2/80">
            Preço no Steam: <span className="line-through">{formatBRL(steamPrice)}</span>
          </p>
        )}

        {/* Versão */}
        <div
          role="radiogroup"
          aria-label="Versão"
          className="mt-[17px] grid h-[34px] auto-cols-fr grid-flow-col gap-[3px] rounded-[11px] border border-[#1b1c20] bg-[#111215] p-[2px]"
        >
          {skin.variants.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={variant === v}
              onClick={() => setVariant(v)}
              className={cn(
                "rounded-[9px] text-[13.5px] font-semibold transition-colors",
                variant === v ? "btn-solid-red text-white" : "text-fg hover:text-white",
              )}
            >
              {VARIANT_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Condição */}
        <p className="mt-[15px] text-[12.5px] leading-[16px] text-fg-2">Condição (Float)</p>
        <div role="radiogroup" aria-label="Condição" className="mt-[7px] grid grid-cols-3 gap-x-[10px] gap-y-[7px]">
          {WEARS.map((w) => {
            const o = skin.offers.find((x) => x.wear === w.code);
            const active = wear === w.code;
            const disabled = !o?.available;
            return (
              <button
                key={w.code}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => setWear(w.code)}
                title={w.name}
                className={cn(
                  "flex h-[47px] flex-col justify-center rounded-[8px] border pl-[18px] text-left transition-colors",
                  active
                    ? "border-[#ff2142] bg-[linear-gradient(180deg,#1a0609,#100406)] shadow-[0_0_14px_-5px_rgb(230_0_35/0.7)]"
                    : "border-[#1d1e22] bg-[#0e0f11] hover:border-[#2c2d33]",
                  disabled && "opacity-40",
                )}
              >
                <span className="text-[12px] font-bold leading-[15px]" style={{ color: active ? "#ff3b4f" : WEAR_COLORS[w.code] }}>
                  {w.code}
                </span>
                <span className="text-[13px] font-semibold leading-[17px] text-fg">
                  {o ? formatBRL(priceFor(o, variant)) : "Indisponível"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Informações */}
        <dl className="mt-[13px] px-[3px] text-[12.5px]">
          {[
            ["Condição", wearName(wear), "text-fg font-medium text-[12px]"],
            ["Float", formatFloat(offer.float), "text-fg-2 text-[12px]"],
            ["StatTrak™", variant === "stattrak" ? "Sim" : "Não", "text-fg font-semibold text-[12px]"],
            ["Entrega", skin.deliveryEstimate, "text-fg font-semibold text-[12px]"],
          ].map(([k, v, cls]) => (
            <div key={k} className="flex h-[27.6px] items-center justify-between border-b border-[#16171b]">
              <dt className="text-fg-2">{k}</dt>
              <dd className={cls}>{v}</dd>
            </div>
          ))}
        </dl>

        {/* Inspeção */}
        <button
          type="button"
          onClick={() =>
            openWhatsApp(
              `Olá, BRN Skins! Quero inspecionar em jogo: ${name} (${wearName(wear)}${
                variant !== "normal" ? `, ${VARIANT_LABELS[variant]}` : ""
              }).`,
            )
          }
          className="mt-[7px] flex h-[65px] items-center gap-[14px] rounded-[10px] border border-[#1b1c20] bg-[linear-gradient(180deg,#0f1013,#0b0c0e)] pl-[13px] pr-[12px] text-left transition-colors hover:border-[#2c2d33]"
        >
          <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-[radial-gradient(circle,rgb(230_0_35/0.4),rgb(230_0_35/0.05)_70%)] text-fg">
            <Gamepad2 size={22} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-bold leading-[16px]">Quer inspecionar esta skin em jogo?</span>
            <span className="mt-[1px] block text-[11.5px] leading-[15px] text-fg-2">
              Escolha o float e o padrão (pattern) ou use o acabamento perfeito.
            </span>
          </span>
          <ChevronRight size={18} strokeWidth={2} className="shrink-0" />
        </button>

        {/* Quantidade / total */}
        <div className="mt-[15px] rounded-[10px] border border-[#1b1c20] bg-[linear-gradient(180deg,#0e0f12,#0a0b0d)] max-lg:sticky max-lg:bottom-[max(10px,env(safe-area-inset-bottom))] max-lg:z-10 max-lg:rounded-[16px] max-lg:bg-[#0c0d10] max-lg:shadow-[0_-16px_36px_6px_rgb(4_5_7/0.95)] px-[9px] pb-[12px] pt-[9px]">
          <div className="flex items-center justify-between">
            <div className="pl-[1px]">
              <p className="text-[12.5px] leading-[16px] text-fg-2 max-lg:hidden">Quantidade</p>
              <p className="flex items-center gap-[7px] text-[15px] leading-[20px] lg:mt-[5px]">
                <span className="text-fg-2">Total</span>
                <span className="size-[4px] rounded-full bg-fg" aria-hidden />
                <span className="text-[15.5px] font-bold">{formatBRL(total)}</span>
              </p>
            </div>
            <QuantityStepper value={qty} onChange={setQty} className="!h-[35px]" />
          </div>
          <button
            type="button"
            onClick={add}
            className="btn-solid-red mt-[10px] flex h-[42px] lg:mt-[16px] lg:h-[37px] w-full items-center justify-center gap-[10px] rounded-[8px] text-[14px] font-semibold text-white"
          >
            <ShoppingCart size={19} strokeWidth={2} />
            Adicionar ao carrinho
          </button>
          <button
            type="button"
            onClick={() => {
              add();
              router.push("/carrinho");
            }}
            className="mt-[11px] flex h-[37px] w-full items-center justify-center gap-[10px] rounded-[8px] border border-[#34353b] max-lg:hidden bg-[#0c0d0f] text-[14px] font-semibold text-white transition-colors hover:border-[#4a4b52]"
          >
            <ShoppingCart size={19} strokeWidth={2} />
            Revisar pedido
          </button>
        </div>
      </div>
    </div>
  );
}

export function SkinDetailsDrawer() {
  const selectedId = useCatalogStore((s) => s.selectedSkinId);
  const closeSkin = useCatalogStore((s) => s.closeSkin);
  const { getSkin } = useCatalogData();
  const isDesktop = useIsDesktop();
  const skin = useMemo(() => (selectedId ? getSkin(selectedId) : undefined), [selectedId, getSkin]);

  useLockBodyScroll(Boolean(skin) && !isDesktop);

  useEffect(() => {
    if (!skin) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSkin();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skin, closeSkin]);

  return (
    <AnimatePresence>
      {skin && (
        <motion.aside
          key="skin-drawer"
          role="dialog"
          aria-modal={!isDesktop}
          aria-label={`Detalhes: ${skinDisplayName(skin)}`}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={isDesktop ? { width: DRAWER_WIDTH } : undefined}
          className="scrollbar-thin fixed inset-0 z-[60] overflow-y-auto bg-[#070709] lg:inset-auto lg:bottom-0 lg:right-0 lg:top-0 lg:z-50 lg:border-l lg:border-[#3d0a12] lg:shadow-[-18px_0_40px_-12px_rgb(0_0_0/0.95)]"
        >
          <DrawerBody key={skin.id} skin={skin} onClose={closeSkin} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
