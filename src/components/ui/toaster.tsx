"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, Check } from "lucide-react";
import { create } from "zustand";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "success") => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, tone?: Toast["tone"]) => useToastStore.getState().push(message, tone);

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(92px+env(safe-area-inset-bottom))] left-1/2 lg:bottom-4 z-[80] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-[10px] border border-border-strong bg-elevated px-3.5 py-2.5 text-[13px] text-fg shadow-[0_12px_32px_-12px_rgb(0_0_0/0.8)]"
          >
            <span
              className={
                t.tone === "error"
                  ? "grid size-5 place-items-center rounded-full bg-primary/20 text-primary"
                  : "grid size-5 place-items-center rounded-full bg-success/15 text-success"
              }
            >
              {t.tone === "error" ? <CircleAlert size={13} /> : <Check size={13} />}
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
