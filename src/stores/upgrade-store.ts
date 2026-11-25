"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VariantType, WearCode } from "@/types/catalog";
import type { SteamInventoryItem } from "@/integrations/steam/types";
import { UPGRADE, type UpgradeMultiplier } from "@/config/upgrade";
import { safeStorage } from "./storage";

/** Skin do catálogo escolhida como alvo, com condição e variação. */
export interface UpgradePick {
  skinId: string;
  wear: WearCode;
  variant: VariantType;
}

/** Item do inventário Steam do cliente colocado na oferta. */
export type OfferItem = Pick<SteamInventoryItem, "assetId" | "marketHashName" | "name" | "image" | "rarityColor" | "exterior">;

export interface SteamAccount {
  steamId: string;
  tradeLink: string | null;
}

interface UpgradeState {
  steam: SteamAccount | null;
  offer: OfferItem[];
  target: UpgradePick | null;
  multiplier: UpgradeMultiplier;
  connect: (account: SteamAccount) => void;
  disconnect: () => void;
  /** Substitui a seleção de itens da oferta (limite em UPGRADE.maxOfferItems) */
  setOffer: (items: OfferItem[]) => void;
  remove: (assetId: string) => void;
  setTarget: (pick: UpgradePick | null) => void;
  setMultiplier: (m: UpgradeMultiplier) => void;
  reset: () => void;
}

export const useUpgradeStore = create<UpgradeState>()(
  persist(
    (set) => ({
      steam: null,
      offer: [],
      target: null,
      multiplier: 2,
      connect: (steam) => set((s) => ({ steam, offer: s.steam?.steamId === steam.steamId ? s.offer : [] })),
      disconnect: () => set({ steam: null, offer: [] }),
      setOffer: (items) => set({ offer: items.slice(0, UPGRADE.maxOfferItems) }),
      remove: (assetId) => set((s) => ({ offer: s.offer.filter((i) => i.assetId !== assetId) })),
      setTarget: (target) => set({ target }),
      setMultiplier: (multiplier) => set({ multiplier }),
      reset: () => set({ offer: [], target: null }),
    }),
    {
      name: "brn-upgrade",
      storage: safeStorage,
      version: 2,
      // v1 guardava skins do catálogo na oferta; agora a oferta vem do inventário Steam.
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Partial<UpgradeState>;
        return { target: old.target ?? null, multiplier: old.multiplier ?? 2, steam: null, offer: [] } as unknown as UpgradeState;
      },
    },
  ),
);
