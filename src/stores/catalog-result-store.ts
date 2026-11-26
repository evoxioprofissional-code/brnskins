"use client";

import { create } from "zustand";
import type { Skin } from "@/types/catalog";
import type { WeaponCount } from "@/lib/catalog-query";

/**
 * Estado compartilhado do catálogo paginado:
 * - resumo da última página (contagens, faixa de preço, total) para filtros e abas;
 * - cache dos itens já carregados (drawer, favoritos, carrinho, upgrade).
 */
interface CatalogResultState {
  total: number;
  counts: Record<string, number>;
  priceBounds: [number, number];
  weaponCounts: WeaponCount[];
  loading: boolean;
  skins: Record<string, Skin>;
  setSummary: (s: { total: number; counts: Record<string, number>; priceBounds: [number, number]; weaponCounts?: WeaponCount[] }) => void;
  setLoading: (loading: boolean) => void;
  remember: (list: Skin[]) => void;
}

export const useCatalogResultStore = create<CatalogResultState>()((set) => ({
  total: 0,
  counts: {},
  priceBounds: [1, 100],
  weaponCounts: [],
  loading: false,
  skins: {},
  setSummary: ({ total, counts, priceBounds, weaponCounts = [] }) => set({ total, counts, priceBounds, weaponCounts }),
  setLoading: (loading) => set({ loading }),
  remember: (list) =>
    set((s) => {
      if (!list.length) return s;
      const next = { ...s.skins };
      for (const sk of list) next[sk.id] = sk;
      return { skins: next };
    }),
}));
