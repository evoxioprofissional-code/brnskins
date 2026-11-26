"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import type { CatalogDataSource, Kit, Skin } from "@/types/catalog";
import type { CatalogPage } from "@/lib/catalog-query";
import { useSettingsStore } from "@/stores/settings-store";
import { useCatalogResultStore } from "@/stores/catalog-result-store";
import { useHydrated } from "@/hooks/use-hydrated";

interface CatalogData {
  kits: Kit[];
  source: CatalogDataSource;
  /** Primeira página renderizada no servidor (filtros padrão) */
  initialPage: CatalogPage | null;
  /** Item já carregado (página atual, favoritos, kits...) */
  getSkin: (id: string) => Skin | undefined;
  /** Aplica ajustes locais do admin demo (preço/visibilidade) */
  adjust: (skins: Skin[]) => Skin[];
}

const CatalogDataContext = createContext<CatalogData | null>(null);
const NO_SKINS: Skin[] = [];

/**
 * Dados do catálogo no navegador. O catálogo completo NÃO vem para o
 * cliente: as páginas são buscadas em /api/catalog (ver use-catalog-page).
 */
export function CatalogDataProvider({
  initialPage = null,
  skins = NO_SKINS,
  kits,
  source,
  children,
}: {
  initialPage?: CatalogPage | null;
  /** Itens extras já conhecidos no servidor (ex.: itens dos kits) */
  skins?: Skin[];
  kits: Kit[];
  source: CatalogDataSource;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const overrides = useSettingsStore((s) => s.priceOverrides);
  const hidden = useSettingsStore((s) => s.hiddenSkins);
  const cache = useCatalogResultStore((s) => s.skins);

  // Semeia o cache e o resumo com o que veio do servidor (só no navegador:
  // no servidor o store é compartilhado entre visitantes)
  const seeded = useRef(false);
  if (!seeded.current && typeof window !== "undefined") {
    seeded.current = true;
    const state = useCatalogResultStore.getState();
    const initial = [...(initialPage?.items ?? []), ...skins];
    if (initial.length) state.remember(initial);
    if (initialPage) state.setSummary(initialPage);
  }

  const adjust = useCallback(
    (list: Skin[]) =>
      hydrated && (hidden.length || Object.keys(overrides).length)
        ? list
            .filter((s) => !hidden.includes(s.id))
            .map((s) => ({
              ...s,
              offers: s.offers.map((o) => {
                const p = overrides[`${s.id}:${o.wear}`];
                return p === undefined ? o : { ...o, price: p };
              }),
            }))
        : list,
    [hydrated, hidden, overrides],
  );

  const value = useMemo<CatalogData>(
    () => ({
      kits,
      source,
      initialPage,
      adjust,
      getSkin: (id) => {
        const s = cache[id];
        return s ? adjust([s])[0] : undefined;
      },
    }),
    [kits, source, initialPage, adjust, cache],
  );

  return <CatalogDataContext.Provider value={value}>{children}</CatalogDataContext.Provider>;
}

export function useCatalogData() {
  const ctx = useContext(CatalogDataContext);
  if (!ctx) throw new Error("useCatalogData deve ser usado dentro de <CatalogDataProvider>");
  return ctx;
}

/**
 * Resumo do catálogo (contagens por categoria, faixa de preço, total).
 * No servidor o store fica vazio, então usa a página inicial — assim o HTML
 * do servidor e a primeira renderização no navegador são iguais.
 */
export function useCatalogSummary() {
  const { initialPage } = useCatalogData();
  const counts = useCatalogResultStore((s) => s.counts);
  const priceBounds = useCatalogResultStore((s) => s.priceBounds);
  const total = useCatalogResultStore((s) => s.total);
  const weaponCounts = useCatalogResultStore((s) => s.weaponCounts);
  if (Object.keys(counts).length) return { counts, priceBounds, total, weaponCounts };
  return {
    counts: initialPage?.counts ?? {},
    priceBounds: initialPage?.priceBounds ?? ([1, 100] as [number, number]),
    total: initialPage?.total ?? 0,
    weaponCounts: initialPage?.weaponCounts ?? [],
  };
}
