"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/cart";
import { safeStorage } from "./storage";

const MAX_QTY = 99;

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.key === item.key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === item.key ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + item.quantity) } : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      setQuantity: (key, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.key === key ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, Math.round(quantity))) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "brn-cart", storage: safeStorage, version: 1 },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const cartSubtotal = (items: CartItem[]) =>
  Math.round(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100) / 100;
export const MAX_CART_QTY = MAX_QTY;
