"use client";

import { Funnel, X } from "lucide-react";
import type { ReactNode } from "react";
import { CATEGORIES, WEARS, WEAR_COLORS } from "@/config/catalog";
import { CATEGORY_ICONS } from "@/components/icons/category-icons";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { useCatalogStore } from "@/stores/catalog-store";
import { useCatalogSummary } from "./catalog-data-provider";
import type { CatalogFilters } from "@/types/filters";
import { EMPTY_FILTERS } from "@/types/filters";
import { PriceRangeSlider } from "./price-range-slider";
import { WeaponFilter } from "./weapon-filter";

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-[15px]", className)}>
      <h3 className="mb-[5px] text-[12.5px] font-semibold text-fg">{title}</h3>
      {children}
    </div>
  );
}

function PriceInput({
  value,
  placeholder,
  onChange,
}: {
  value: number | null;
  placeholder: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      value={value ?? ""}
      placeholder={placeholder}
      aria-label={`Preço ${placeholder.toLowerCase()}`}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : Math.max(0, Number(v)));
      }}
      className="h-[30px] w-full min-w-0 rounded-[7px] border border-[#1c1d21] bg-[#0e0f11] px-[8px] text-[12.5px] text-fg outline-none transition-colors focus:border-primary/60"
    />
  );
}

const isDirty = (f: CatalogFilters) => JSON.stringify(f) !== JSON.stringify({ ...EMPTY_FILTERS, query: f.query });

export function FiltersPanel({ onClose, variant = "sidebar" }: { onClose?: () => void; variant?: "sidebar" | "sheet" }) {
  const filters = useCatalogStore((s) => s.filters);
  const setFilter = useCatalogStore((s) => s.setFilter);
  const toggleInList = useCatalogStore((s) => s.toggleInList);
  const resetFilters = useCatalogStore((s) => s.resetFilters);
  const { counts, priceBounds: bounds } = useCatalogSummary();
  const dirty = isDirty(filters);
  const priceBounds: [number, number] = [Math.max(1, Math.floor(bounds[0])), Math.max(2, Math.ceil(bounds[1]))];

  const categories = [{ id: "all" as const, label: "Todas" }, ...CATEGORIES];

  return (
    <div className="flex flex-col">
      <div className="flex h-[35px] items-center justify-between border-b border-[#17181c] pl-[17px] pr-[14px]">
        <h2 className="flex items-center gap-[10px] text-[14.5px] font-semibold">
          <Funnel size={17} strokeWidth={2} aria-hidden />
          Filtros
        </h2>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11.5px] font-semibold text-primary hover:text-primary-hover"
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={onClose ?? resetFilters}
            aria-label={onClose ? "Fechar filtros" : "Limpar filtros"}
            title={onClose ? "Fechar filtros" : "Limpar filtros"}
            className="grid size-6 place-items-center rounded-md text-fg-2 transition-colors hover:text-fg"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={cn("flex flex-col gap-[14px] pb-[16px] pt-[13px]", variant === "sheet" && "pb-6")}>
        <Section title="Preço (R$)">
          <div className="grid grid-cols-2 gap-[10px]">
            <PriceInput value={filters.minPrice} placeholder="Mínimo" onChange={(v) => setFilter("minPrice", v)} />
            <PriceInput value={filters.maxPrice} placeholder="Máximo" onChange={(v) => setFilter("maxPrice", v)} />
          </div>
        </Section>

        <Section title="Categoria" className="-mt-[1px] [&>h3]:mb-[3px]">
          <ul className="flex flex-col">
            {categories.map((c) => {
              const Icon = CATEGORY_ICONS[c.id];
              const active = filters.category === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setFilter("category", c.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-[27px] w-full items-center rounded-[6px] pl-[11px] pr-[7px] text-[13px] font-medium transition-colors",
                      active
                        ? "bg-[linear-gradient(90deg,#c4001f_0%,#9b0019_55%,#5a000e_100%)] text-white shadow-[0_0_14px_-4px_rgb(230_0_35/0.7)]"
                        : "text-fg hover:bg-white/[0.03]",
                    )}
                  >
                    <Icon size={15} className="opacity-90" />
                    <span className="ml-[10px] flex-1 text-left">{c.label}</span>
                    <span className={cn("tabular-nums text-[12.5px]", active ? "text-white" : "text-fg-2")}>
                      {formatInt(counts[c.id] ?? 0)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <WeaponFilter />

        <Section title="Desgaste">
          <div className="grid grid-cols-5 gap-[5px]">
            {WEARS.map((w) => {
              const active = filters.wears.includes(w.code);
              return (
                <button
                  key={w.code}
                  type="button"
                  title={w.name}
                  aria-pressed={active}
                  onClick={() => toggleInList("wears", w.code)}
                  className={cn(
                    "h-[28px] rounded-[6px] border text-[11.5px] font-bold transition-colors",
                    active ? "border-primary/80 bg-primary/15" : "border-[#1c1d21] bg-[#0e0f11] hover:border-[#2a2b31]",
                  )}
                  style={{ color: WEAR_COLORS[w.code] }}
                >
                  {w.code}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Faixa de preço">
          <PriceRangeSlider
            bounds={priceBounds}
            min={filters.minPrice}
            max={filters.maxPrice}
            onChange={(min, max) => {
              setFilter("minPrice", min);
              setFilter("maxPrice", max);
            }}
          />
        </Section>
      </div>
    </div>
  );
}
