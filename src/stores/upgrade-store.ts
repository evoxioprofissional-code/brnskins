"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VariantType, WearCode } from "@/types/catalog";
import { UPGRADE, type UpgradeMultiplier } from "@/config/upgrade";
import { createId } from "@/lib/id";
import { safeStorage } from "./storage";

/** Skin do catálogo escolhida com condição e variação. */
export interface UpgradePick {
  skinId: string;
  wear: WearCode;
  variant: VariantType;
}

/** Item oferecido: do catálogo (com estimativa) ou informado à mão (avaliado pela equipe). */
export type OfferItem =
  | ({ key: string; kind: "catalog" } & UpgradePick)
  | { key: string; kind: "custom"; name: string };

interface UpgradeState {
  offer: OfferItem[];
  target: UpgradePick | null;
  multiplier: UpgradeMultiplier;
  addCatalog: (pick: UpgradePick) => void;
  addCustom: (name: string) => void;
  remove: (key: string) => void;
  setTarget: (pick: UpgradePick | null) => void;
  setMultiplier: (m: UpgradeMultiplier) => void;
  reset: () => void;
}

export const useUpgradeStore = create<UpgradeState>()(
  persist(
    (set) => ({
      offer: [],
      target: null,
      multiplier: 2,
      addCatalog: (pick) =>
        set((s) =>
          s.offer.length >= UPGRADE.maxOfferItems
            ? s
            : { offer: [...s.offer, { key: createId("up"), kind: "catalog", ...pick }] },
        ),
      addCustom: (name) =>
        set((s) =>
          s.offer.length >= UPGRADE.maxOfferItems
            ? s
            : { offer: [...s.offer, { key: createId("up"), kind: "custom", name: name.trim() }] },
        ),
      remove: (key) => set((s) => ({ offer: s.offer.filter((i) => i.key !== key) })),
      setTarget: (target) => set({ target }),
      setMultiplier: (multiplier) => set({ multiplier }),
      reset: () => set({ offer: [], target: null }),
    }),
    { name: "brn-upgrade", storage: safeStorage, version: 1 },
  ),
);
