"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { SORT_OPTIONS } from "@/config/catalog";
import { cn } from "@/lib/cn";
import { useCatalogStore } from "@/stores/catalog-store";

function SortSelect() {
  const sort = useCatalogStore((s) => s.sort);
  const setSort = useCatalogStore((s) => s.setSort);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.id === sort) ?? SORT_OPTIONS[0]!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1 lg:w-[214px] lg:flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-[40px] w-full items-center rounded-[12px] border border-[#1b1c20] lg:h-[36px] lg:rounded-[10px] bg-[linear-gradient(180deg,#0e0f12,#0a0b0d)] pl-[16px] pr-[16px] text-[13.5px]"
      >
        <span className="hidden text-fg-2 sm:inline">Ordenar por:</span>
        <span className="truncate font-semibold text-fg sm:ml-[6px]">{current.label}</span>
        <ChevronDown size={16} strokeWidth={2.2} className={cn("ml-auto shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Ordenar por"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+6px)] z-30 w-full min-w-[200px] rounded-[10px] border border-border-strong bg-elevated p-1.5 shadow-2xl"
          >
            {SORT_OPTIONS.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === sort}
                  onClick={() => {
                    setSort(o.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-white/[0.05]",
                    o.id === sort ? "font-semibold text-fg" : "text-fg-2",
                  )}
                >
                  {o.label}
                  {o.id === sort && <Check size={14} className="text-primary" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CatalogToolbar({ onOpenFilters, activeFilterCount }: { onOpenFilters: () => void; activeFilterCount: number }) {
  const query = useCatalogStore((s) => s.filters.query);
  const setFilter = useCatalogStore((s) => s.setFilter);
  const view = useCatalogStore((s) => s.view);
  const setView = useCatalogStore((s) => s.setView);

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-0">
      <label className="flex h-[42px] min-w-0 flex-1 items-center rounded-[12px] lg:h-[36px] lg:rounded-[10px] border border-[#1b1c20] bg-[linear-gradient(180deg,#0e0f12,#0a0b0d)] lg:mr-[26px]">
        <Search size={18} strokeWidth={2} className="ml-[14px] shrink-0 text-fg" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setFilter("query", e.target.value)}
          placeholder="Buscar no catálogo..."
          aria-label="Buscar no catálogo"
          className="ml-[12px] h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-fg outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      <div className="flex items-center gap-2.5 lg:gap-0">
        <button
          type="button"
          onClick={onOpenFilters}
          className="relative flex h-[40px] flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#1b1c20] bg-[#0c0d0f] px-3.5 text-[13.5px] font-semibold lg:hidden"
        >
          <SlidersHorizontal size={16} /> Filtros
          {activeFilterCount > 0 && (
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10.5px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
        <SortSelect />
        <div className="hidden items-center gap-[4px] lg:ml-[25px] lg:flex" role="group" aria-label="Modo de visualização">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label="Visualizar em grade"
            className={cn(
              "grid h-[36px] w-[40px] place-items-center rounded-[9px] transition-colors",
              view === "grid"
                ? "bg-[linear-gradient(180deg,#e8102f,#b8001b)] text-white shadow-[0_0_14px_-3px_rgb(230_0_35/0.8)]"
                : "bg-[#0e0f11] text-fg hover:bg-[#15161a]",
            )}
          >
            <LayoutGrid size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            aria-label="Visualizar em lista"
            className={cn(
              "grid h-[36px] w-[40px] place-items-center rounded-[9px] transition-colors",
              view === "list"
                ? "bg-[linear-gradient(180deg,#e8102f,#b8001b)] text-white shadow-[0_0_14px_-3px_rgb(230_0_35/0.8)]"
                : "bg-[#0e0f11] text-fg hover:bg-[#15161a]",
            )}
          >
            <List size={19} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
