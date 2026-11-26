"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CatalogFilters, SortOption, ViewMode } from "@/types/filters";
import { EMPTY_FILTERS } from "@/types/filters";
import { safeStorage } from "./storage";

export type CatalogTab = "catalog" | "inventory" | "favorites" | "upgrades" | "inspect";
type ListKey = "wears" | "rarities" | "colors" | "weapons";

interface CatalogUIState {
  filters: CatalogFilters;
  sort: SortOption;
  page: number;
  view: ViewMode;
  tab: CatalogTab;
  selectedSkinId: string | null;
  mobileFiltersOpen: boolean;
  setFilter: <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => void;
  toggleInList: (key: ListKey, value: string) => void;
  resetFilters: () => void;
  setSort: (sort: SortOption) => void;
  setPage: (page: number) => void;
  setView: (view: ViewMode) => void;
  setTab: (tab: CatalogTab) => void;
  openSkin: (id: string) => void;
  closeSkin: () => void;
  setMobileFiltersOpen: (open: boolean) => void;
}

export const useCatalogStore = create<CatalogUIState>()(
  persist(
    (set) => ({
      filters: EMPTY_FILTERS,
      sort: "featured",
      page: 1,
      view: "grid",
      tab: "catalog",
      selectedSkinId: null,
      mobileFiltersOpen: false,
      // Trocar de categoria limpa a seleção de armas (ex.: AK-47 não existe em Sniper)
      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value, ...(key === "category" ? { weapons: [] } : {}) }, page: 1 })),
      toggleInList: (key, value) =>
        set((s) => {
          const list = s.filters[key] as string[];
          const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
          return { filters: { ...s.filters, [key]: next } as CatalogFilters, page: 1 };
        }),
      resetFilters: () => set({ filters: EMPTY_FILTERS, page: 1 }),
      setSort: (sort) => set({ sort, page: 1 }),
      setPage: (page) => set({ page: Math.max(1, page) }),
      setView: (view) => set({ view }),
      setTab: (tab) => set({ tab }),
      openSkin: (id) => set({ selectedSkinId: id }),
      closeSkin: () => set({ selectedSkinId: null }),
      setMobileFiltersOpen: (mobileFiltersOpen) => set({ mobileFiltersOpen }),
    }),
    {
      name: "brn-catalog-ui",
      storage: safeStorage,
      version: 1,
      // Apenas preferências de visualização persistem; o drawer sempre inicia fechado.
      partialize: (s) => ({ view: s.view, sort: s.sort }),
    },
  ),
);
