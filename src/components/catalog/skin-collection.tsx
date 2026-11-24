"use client";

import { useCallback } from "react";
import { SearchX } from "lucide-react";
import type { Skin } from "@/types/catalog";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { toast } from "@/components/ui/toaster";
import { SkinCard } from "./skin-card";
import { SkinListRow } from "./skin-list-row";

export function SkinCollection({
  skins,
  emptyTitle = "Nenhuma skin encontrada",
  emptyText = "Ajuste os filtros ou a busca para ver mais resultados.",
}: {
  skins: Skin[];
  emptyTitle?: string;
  emptyText?: string;
}) {
  const hydrated = useHydrated();
  const view = useCatalogStore((s) => s.view);
  const selectedId = useCatalogStore((s) => s.selectedSkinId);
  const openSkin = useCatalogStore((s) => s.openSkin);
  const favIds = useFavoritesStore((s) => s.ids);
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const onToggleFavorite = useCallback(
    (id: string) => {
      const was = useFavoritesStore.getState().ids.includes(id);
      toggleFav(id);
      toast(was ? "Removido dos favoritos" : "Adicionado aos favoritos");
    },
    [toggleFav],
  );

  if (!skins.length) {
    return (
      <div className="panel grid place-items-center px-6 py-16 text-center">
        <SearchX size={30} className="text-primary" />
        <p className="mt-3 text-[15px] font-semibold">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-[13px] text-fg-2">{emptyText}</p>
      </div>
    );
  }

  const isFav = (id: string) => hydrated && favIds.includes(id);
  const listView = hydrated && view === "list" && window.matchMedia("(min-width: 1024px)").matches;

  if (listView) {
    return (
      <div className="flex flex-col gap-2">
        {skins.map((s) => (
          <SkinListRow
            key={s.id}
            skin={s}
            selected={selectedId === s.id}
            favorite={isFav(s.id)}
            onOpen={openSkin}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(172px,1fr))] lg:gap-[12px]">
      {skins.map((s, i) => (
        <SkinCard
          key={s.id}
          skin={s}
          selected={selectedId === s.id}
          favorite={isFav(s.id)}
          onOpen={openSkin}
          onToggleFavorite={onToggleFavorite}
          priority={i < 8}
        />
      ))}
    </div>
  );
}
