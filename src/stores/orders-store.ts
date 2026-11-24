"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order, OrderStatus } from "@/types/cart";
import { safeStorage } from "./storage";

/**
 * Pedidos registrados localmente ao finalizar pelo WhatsApp.
 * Substituir por persistência no Supabase (tabelas orders / order_items).
 */
interface OrdersState {
  orders: Order[];
  add: (order: Order) => void;
  setStatus: (id: string, status: OrderStatus) => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set) => ({
      orders: [],
      add: (order) => set((s) => ({ orders: [order, ...s.orders] })),
      setStatus: (id, status) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) })),
    }),
    { name: "brn-orders", storage: safeStorage, version: 1 },
  ),
);
