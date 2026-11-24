"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CatalogDataSource, Kit, Skin } from "@/types/catalog";
import { useSettingsStore } from "@/stores/settings-store";
import { useHydrated } from "@/hooks/use-hydrated";

interface CatalogData {
  skins: Skin[];
  kits: Kit[];
  source: CatalogDataSource;
  getSkin: (id: string) => Skin | undefined;
}

const CatalogDataContext = createContext<CatalogData | null>(null);

/**
 * Recebe os dados carregados no servidor pelo repositório do catálogo e
 * aplica os ajustes locais feitos no admin (preços / visibilidade).
 */
export function CatalogDataProvider({
  skins,
  kits,
  source,
  children,
}: {
  skins: Skin[];
  kits: Kit[];
  source: CatalogDataSource;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const overrides = useSettingsStore((s) => s.priceOverrides);
  const hidden = useSettingsStore((s) => s.hiddenSkins);

  const value = useMemo<CatalogData>(() => {
    const applied = hydrated
      ? skins
          .filter((s) => !hidden.includes(s.id))
          .map((s) => ({
            ...s,
            offers: s.offers.map((o) => {
              const p = overrides[`${s.id}:${o.wear}`];
              return p === undefined ? o : { ...o, price: p };
            }),
          }))
      : skins;
    const byId = new Map(skins.map((s) => [s.id, s]));
    const appliedById = new Map(applied.map((s) => [s.id, s]));
    return {
      skins: applied,
      kits,
      source,
      getSkin: (id) => appliedById.get(id) ?? byId.get(id),
    };
  }, [skins, kits, source, overrides, hidden, hydrated]);

  return <CatalogDataContext.Provider value={value}>{children}</CatalogDataContext.Provider>;
}

export function useCatalogData() {
  const ctx = useContext(CatalogDataContext);
  if (!ctx) throw new Error("useCatalogData deve ser usado dentro de <CatalogDataProvider>");
  return ctx;
}
