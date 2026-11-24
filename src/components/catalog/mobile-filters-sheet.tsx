"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { FiltersPanel } from "./filters-panel";

export function MobileFiltersSheet({
  open,
  onClose,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  resultCount: number;
}) {
  useLockBodyScroll(open);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] flex-col rounded-t-[18px] border-t border-border-strong bg-bg-soft lg:hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto mb-1 mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20" />
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              <FiltersPanel variant="sheet" onClose={onClose} />
            </div>
            <div className="border-t border-border p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                className="btn-solid-red h-11 w-full rounded-[10px] text-[14.5px] font-semibold"
              >
                Ver {resultCount} {resultCount === 1 ? "resultado" : "resultados"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
