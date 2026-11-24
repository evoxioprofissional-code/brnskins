"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CatalogFilters, SortOption, ViewMode } from "@/types/filters";
import { EMPTY_FILTERS } from "@/types/filters";
import { safeStorage } from "./storage";

export type CatalogTab = "catalog" | "inventory" | "favorites" | "upgrades" | "inspect";
type ListKey = "wears" | "rarities" | "colors";

interface CatalogUIState {
  filters: CatalogFilters;
  sort: SortOption;
  view: ViewMode;
  tab: CatalogTab;
  selectedSkinId: string | null;
  mobileFiltersOpen: boolean;
  setFilter: <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => void;
  toggleInList: (key: ListKey, value: string) => void;
  resetFilters: () => void;
  setSort: (sort: SortOption) => void;
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
      view: "grid",
      tab: "catalog",
      selectedSkinId: null,
      mobileFiltersOpen: false,
      setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
      toggleInList: (key, value) =>
        set((s) => {
          const list = s.filters[key] as string[];
          const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
          return { filters: { ...s.filters, [key]: next } as CatalogFilters };
        }),
      resetFilters: () => set({ filters: EMPTY_FILTERS }),
      setSort: (sort) => set({ sort }),
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
