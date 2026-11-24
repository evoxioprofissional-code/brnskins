"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, Package, ShoppingCart } from "lucide-react";
import type { Kit, Skin } from "@/types/catalog";
import { getCategory, getRarity, WEAR_COLORS } from "@/config/catalog";
import { formatBRL } from "@/lib/format";
import { getOffer, priceFor, skinDisplayName, wearName } from "@/lib/skin";
import { useCartStore } from "@/stores/cart-store";
import { useCatalogStore } from "@/stores/catalog-store";
import { useCatalogData } from "@/components/catalog/catalog-data-provider";
import { SkinDetailsDrawer } from "@/components/product/skin-details-drawer";
import { toast } from "@/components/ui/toaster";

interface ResolvedKit {
  kit: Kit;
  items: { skin: Skin; wear: Kit["items"][number]["wear"]; price: number }[];
  itemsTotal: number;
}

function KitCard({ data, index }: { data: ResolvedKit; index: number }) {
  const add = useCartStore((s) => s.add);
  const openSkin = useCatalogStore((s) => s.openSkin);
  const { kit, items, itemsTotal } = data;
  const savings = Math.max(0, itemsTotal - kit.price);
  const pct = itemsTotal > 0 ? Math.round((savings / itemsTotal) * 100) : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="flex flex-col overflow-hidden rounded-[12px] border border-[#18191d] bg-[radial-gradient(80%_60%_at_50%_0%,rgb(170_0_25/0.18),transparent_70%),linear-gradient(180deg,#0c0d0f,#090a0c)]"
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-bold">
            <Package size={17} className="text-primary" /> {kit.name}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-2">{kit.description}</p>
        </div>
        {kit.tag && (
          <span className="shrink-0 rounded-[5px] bg-[linear-gradient(180deg,#e3082a,#b5001b)] px-2 py-[3px] text-[10.5px] font-bold uppercase text-white">
            {kit.tag}
          </span>
        )}
      </header>

      <ul className="mt-3 grid grid-cols-2 gap-2 px-4">
        {items.map(({ skin, wear }) => (
          <li key={skin.id}>
            <button
              type="button"
              onClick={() => openSkin(skin.id)}
              className="group relative flex h-[104px] w-full flex-col rounded-[10px] border border-[#1a1b20] bg-[#0b0c0e] p-2 text-left transition-colors hover:border-[#2c2d33]"
              style={{ backgroundImage: `radial-gradient(60% 50% at 50% 40%, ${getRarity(skin.rarity)?.color ?? "#e60023"}1f, transparent 75%)` }}
              aria-label={`Ver detalhes de ${skinDisplayName(skin)}`}
            >
              <span className="text-[9.5px] font-bold text-primary">{getCategory(skin.category)?.badge}</span>
              <span className="relative mt-0.5 flex-1">
                <Image src={skin.image} alt="" fill sizes="160px" className="object-contain transition-transform group-hover:scale-105" />
              </span>
              <span className="truncate text-[11.5px] font-semibold">{skinDisplayName(skin)}</span>
              <span className="text-[10.5px] font-bold" style={{ color: WEAR_COLORS[wear] }}>
                {wearName(wear)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <footer className="mt-auto px-4 pb-4 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] text-fg-2">
              Separado: <span className="line-through">{formatBRL(itemsTotal)}</span>
            </p>
            <p className="text-[20px] font-bold tracking-[-0.01em]">{formatBRL(kit.price)}</p>
          </div>
          {pct > 0 && (
            <span className="rounded-[6px] border border-[#14532d]/70 bg-[#0b2a17] px-2 py-1 text-[12px] font-semibold text-[#3ee07a]">
              Economize {formatBRL(savings)}
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => {
              add({
                kind: "kit",
                key: `kit:${kit.id}`,
                kitId: kit.id,
                name: kit.name,
                images: items.map((i) => i.skin.image),
                itemsLabel: items.map((i) => skinDisplayName(i.skin)).join(", "),
                unitPrice: kit.price,
                quantity: 1,
              });
              toast(`${kit.name} adicionado ao carrinho`);
            }}
            className="btn-solid-red flex h-[38px] items-center justify-center gap-2 rounded-[8px] text-[13.5px] font-semibold"
          >
            <ShoppingCart size={17} /> Adicionar kit ao carrinho
          </button>
          <button
            type="button"
            onClick={() => items[0] && openSkin(items[0].skin.id)}
            aria-label="Ver itens do kit"
            className="grid h-[38px] w-[42px] place-items-center rounded-[8px] border border-[#34353b] bg-[#0c0d0f] transition-colors hover:border-[#4a4b52]"
          >
            <Eye size={17} />
          </button>
        </div>
      </footer>
    </motion.article>
  );
}

export function KitsView() {
  const { kits, getSkin, source } = useCatalogData();
  const closeSkin = useCatalogStore((s) => s.closeSkin);

  const resolved = useMemo<ResolvedKit[]>(
    () =>
      kits.map((kit) => {
        const items = kit.items.flatMap((i) => {
          const skin = getSkin(i.skinId);
          if (!skin) return [];
          return [{ skin, wear: i.wear, price: priceFor(getOffer(skin, i.wear), i.variant) }];
        });
        return { kit, items, itemsTotal: items.reduce((s, i) => s + i.price, 0) };
      }),
    [kits, getSkin],
  );

  // garante o drawer fechado ao sair da página
  useEffect(() => () => closeSkin(), [closeSkin]);

  return (
    <>
      <div className="grid gap-[15px] sm:grid-cols-2 xl:grid-cols-3">
        {resolved.map((k, i) => (
          <KitCard key={k.kit.id} data={k} index={i} />
        ))}
      </div>
      {source.isDemo && <p className="mt-8 text-center text-[11.5px] text-faint">{source.label}.</p>}
      <SkinDetailsDrawer />
    </>
  );
}
