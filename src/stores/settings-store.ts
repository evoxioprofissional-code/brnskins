"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BannerSettings, StoreSettings, WhatsAppSettings } from "@/types/settings";
import {
  DEMO_BANNER_SETTINGS,
  DEMO_STORE_SETTINGS,
  DEMO_WHATSAPP_SETTINGS,
} from "@/data/demo/settings";
import { siteConfig } from "@/config/site";
import { safeStorage } from "./storage";

/**
 * Configurações editáveis no painel admin. Nesta etapa (somente frontend)
 * ficam no navegador; serão migradas para a tabela `settings` do Supabase.
 */
interface SettingsState {
  store: StoreSettings;
  whatsapp: WhatsAppSettings;
  banners: BannerSettings;
  /** Overrides de preço por `${skinId}:${wear}` feitos no admin (demo) */
  priceOverrides: Record<string, number>;
  /** Skins ocultadas do catálogo pelo admin */
  hiddenSkins: string[];
  updateStore: (v: Partial<StoreSettings>) => void;
  updateWhatsApp: (v: Partial<WhatsAppSettings>) => void;
  updateBanners: (v: Partial<BannerSettings>) => void;
  setPriceOverride: (key: string, price: number | null) => void;
  toggleHidden: (skinId: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      store: DEMO_STORE_SETTINGS,
      whatsapp: DEMO_WHATSAPP_SETTINGS,
      banners: DEMO_BANNER_SETTINGS,
      priceOverrides: {},
      hiddenSkins: [],
      updateStore: (v) => set((s) => ({ store: { ...s.store, ...v } })),
      updateWhatsApp: (v) => set((s) => ({ whatsapp: { ...s.whatsapp, ...v } })),
      updateBanners: (v) => set((s) => ({ banners: { ...s.banners, ...v } })),
      setPriceOverride: (key, price) =>
        set((s) => {
          const next = { ...s.priceOverrides };
          if (price === null) delete next[key];
          else next[key] = price;
          return { priceOverrides: next };
        }),
      toggleHidden: (skinId) =>
        set((s) => ({
          hiddenSkins: s.hiddenSkins.includes(skinId)
            ? s.hiddenSkins.filter((x) => x !== skinId)
            : [...s.hiddenSkins, skinId],
        })),
    }),
    { name: "brn-settings", storage: safeStorage, version: 1 },
  ),
);

/** Número efetivo: configurado no admin ou, na falta, o da variável de ambiente. */
export const effectiveWhatsApp = (s: WhatsAppSettings) => s.phone || siteConfig.whatsappNumber;
