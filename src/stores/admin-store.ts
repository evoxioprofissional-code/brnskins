"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Skin, WearCode } from "@/types/catalog";
import type { Client, Movement, RecoveryRule, StockLot, StockStatus, SubStore, SubStorePlan } from "@/types/admin";
import { createAdminSeed } from "@/data/demo/admin";
import { createId } from "@/lib/id";
import { safeStorage } from "./storage";

/**
 * Estado operacional do painel (estoque, financeiro, clientes, sub-lojas).
 * Nesta etapa vive no navegador, semeado com DADOS DEMONSTRATIVOS.
 * Cada ação aqui corresponde a uma escrita futura no Supabase.
 */
interface AdminState {
  seeded: boolean;
  stock: StockLot[];
  movements: Movement[];
  clients: Client[];
  subStores: SubStore[];
  rules: RecoveryRule[];
  recoveryEnabled: boolean;
  monthlyGoal: number;

  ensureSeed: (skins: Skin[]) => void;
  resetDemo: (skins: Skin[]) => void;

  addPurchase: (p: { skin: Skin; wear: WearCode; quantity: number; unitCost: number; marketPrice: number }) => void;
  registerSale: (p: { lotId: string; quantity: number; unitPrice: number; clientId?: string; description: string }) => void;
  setLotStatus: (lotId: string, status: StockStatus) => void;
  setLotMarketPrice: (lotId: string, price: number) => void;

  addSubStore: (p: { name: string; slug: string; owner: string; ownerPhone: string; plan: SubStorePlan }) => void;
  confirmSubStorePayment: (id: string) => void;
  setSubStoreStatus: (id: string, status: SubStore["status"]) => void;

  updateRule: (id: string, patch: Partial<RecoveryRule>) => void;
  setRecoveryEnabled: (v: boolean) => void;
  markContacted: (clientId: string) => void;
  setMonthlyGoal: (v: number) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      seeded: false,
      stock: [],
      movements: [],
      clients: [],
      subStores: [],
      rules: [],
      recoveryEnabled: true,
      monthlyGoal: 150000,

      ensureSeed: (skins) => {
        if (get().seeded) return;
        set({ ...createAdminSeed(skins), seeded: true });
      },
      resetDemo: (skins) => set({ ...createAdminSeed(skins), seeded: true, recoveryEnabled: true }),

      addPurchase: ({ skin, wear, quantity, unitCost, marketPrice }) =>
        set((s) => ({
          stock: [
            {
              id: createId("lot"),
              skinId: skin.id,
              wear,
              quantity,
              unitCost,
              marketPrice,
              status: "selling",
              acquiredAt: new Date().toISOString(),
            },
            ...s.stock,
          ],
          movements: [
            {
              id: createId("mov"),
              type: "in",
              date: new Date().toISOString(),
              skinId: skin.id,
              description: `Compra · ${skin.isStar ? "★ " : ""}${skin.weapon} | ${skin.finish}`,
              quantity,
              amount: round2(unitCost * quantity),
            },
            ...s.movements,
          ],
        })),

      registerSale: ({ lotId, quantity, unitPrice, clientId, description }) =>
        set((s) => {
          const lot = s.stock.find((l) => l.id === lotId);
          if (!lot || quantity < 1 || quantity > lot.quantity) return s;
          const amount = round2(unitPrice * quantity);
          return {
            stock: s.stock
              .map((l) => (l.id === lotId ? { ...l, quantity: l.quantity - quantity } : l))
              .filter((l) => l.quantity > 0),
            movements: [
              {
                id: createId("mov"),
                type: "out" as const,
                date: new Date().toISOString(),
                skinId: lot.skinId,
                description,
                quantity,
                amount,
                cost: round2(lot.unitCost * quantity),
                clientId,
              },
              ...s.movements,
            ],
            clients: clientId
              ? s.clients.map((c) =>
                  c.id === clientId
                    ? { ...c, totalSpent: round2(c.totalSpent + amount), orders: c.orders + 1, lastPurchaseAt: new Date().toISOString() }
                    : c,
                )
              : s.clients,
          };
        }),

      setLotStatus: (lotId, status) => set((s) => ({ stock: s.stock.map((l) => (l.id === lotId ? { ...l, status } : l)) })),
      setLotMarketPrice: (lotId, price) =>
        set((s) => ({ stock: s.stock.map((l) => (l.id === lotId ? { ...l, marketPrice: price } : l)) })),

      addSubStore: (p) =>
        set((s) => ({
          subStores: [
            { id: createId("sub"), ...p, status: "pending", createdAt: new Date().toISOString() },
            ...s.subStores,
          ],
        })),
      confirmSubStorePayment: (id) =>
        set((s) => ({
          subStores: s.subStores.map((x) =>
            x.id === id ? { ...x, status: "active", activatedAt: new Date().toISOString() } : x,
          ),
        })),
      setSubStoreStatus: (id, status) =>
        set((s) => ({ subStores: s.subStores.map((x) => (x.id === id ? { ...x, status } : x)) })),

      updateRule: (id, patch) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      setRecoveryEnabled: (recoveryEnabled) => set({ recoveryEnabled }),
      markContacted: (clientId) =>
        set((s) => ({
          clients: s.clients.map((c) => (c.id === clientId ? { ...c, lastContactAt: new Date().toISOString() } : c)),
        })),
      setMonthlyGoal: (monthlyGoal) => set({ monthlyGoal }),
    }),
    { name: "brn-admin", storage: safeStorage, version: 1 },
  ),
);
