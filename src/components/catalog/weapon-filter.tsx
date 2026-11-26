"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { CATEGORIES } from "@/config/catalog";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { WEAPON_CATEGORIES, type WeaponCount } from "@/lib/catalog-query";
import { useCatalogStore } from "@/stores/catalog-store";
import { useCatalogSummary } from "./catalog-data-provider";

/** Atalhos quando nenhuma categoria está escolhida */
const POPULAR = ["AK-47", "AWP", "M4A4", "M4A1-S", "Desert Eagle", "USP-S", "Glock-18", "Karambit", "Butterfly Knife", "Sport Gloves"];

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function Chip({ w, active, onToggle }: { w: WeaponCount; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition-colors",
        active ? "glow-active text-white" : "border-[#1c1d21] bg-[#0e0f11] text-fg-2 hover:border-[#2a2b31] hover:text-white",
        !active && w.count === 0 && "opacity-40",
      )}
    >
      {w.weapon}
      <span className={cn("tabular-nums text-[10.5px]", active ? "text-white/80" : "text-faint")}>{formatInt(w.count)}</span>
    </button>
  );
}

/** Filtro "Arma": selecionar só AK-47, só AWP etc. (várias de uma vez). */
export function WeaponFilter() {
  const filters = useCatalogStore((s) => s.filters);
  const toggleInList = useCatalogStore((s) => s.toggleInList);
  const setFilter = useCatalogStore((s) => s.setFilter);
  const { weaponCounts } = useCatalogSummary();
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");

  const inCategory = filters.category !== "all";
  const visible = filters.category === "all" || WEAPON_CATEGORIES.includes(filters.category);
  const byName = useMemo(() => new Map(weaponCounts.map((w) => [w.weapon, w])), [weaponCounts]);
  const selected = filters.weapons;
  const toggle = (name: string) => toggleInList("weapons", name);

  // Em uma categoria: todas as armas dela. Em "Todas": atalhos populares + as já escolhidas
  const quick = useMemo<WeaponCount[]>(() => {
    if (inCategory) return weaponCounts;
    const names = [...new Set([...selected, ...POPULAR])];
    return names.flatMap((n) => {
      const w = byName.get(n);
      if (w) return [w];
      return selected.includes(n) ? [{ weapon: n, category: "rifle" as const, count: 0 }] : [];
    });
  }, [inCategory, weaponCounts, selected, byName]);

  // Lista completa agrupada por categoria (só em "Todas")
  const groups = useMemo(() => {
    const term = normalize(q.trim());
    return CATEGORIES.filter((c) => WEAPON_CATEGORIES.includes(c.id))
      .map((c) => ({
        label: c.label,
        items: weaponCounts
          .filter((w) => w.category === c.id && (!term || normalize(w.weapon).includes(term)))
          .sort((a, b) => a.weapon.localeCompare(b.weapon, "pt-BR")),
      }))
      .filter((g) => g.items.length);
  }, [weaponCounts, q]);

  if (!visible || !weaponCounts.length) return null;

  return (
    <div className="px-[15px]">
      <div className="mb-[6px] flex items-center justify-between">
        <h3 className="text-[12.5px] font-semibold text-fg">Arma</h3>
        {selected.length > 0 && (
          <button type="button" onClick={() => setFilter("weapons", [])} className="text-[11px] font-semibold text-primary hover:text-primary-hover">
            Limpar ({selected.length})
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-[5px]">
        {quick.map((w) => (
          <Chip key={w.weapon} w={w} active={selected.includes(w.weapon)} onToggle={() => toggle(w.weapon)} />
        ))}
      </div>

      {!inCategory && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-[8px] inline-flex items-center gap-1 text-[11.5px] font-semibold text-fg-2 hover:text-white"
          >
            {expanded ? "Ocultar lista" : `Ver todas as armas (${weaponCounts.length})`}
            <ChevronDown size={13} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <div className="mt-[8px]">
              <label className="flex h-[30px] items-center gap-2 rounded-[7px] border border-[#1c1d21] bg-[#0e0f11] px-2.5 focus-within:border-primary/60">
                <Search size={13} className="text-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar arma"
                  aria-label="Buscar arma"
                  className="h-full flex-1 bg-transparent text-[12px] outline-none placeholder:text-faint"
                />
              </label>
              <div className="scrollbar-thin mt-[6px] max-h-[260px] space-y-[8px] overflow-y-auto pr-1">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="mb-[3px] text-[10.5px] font-semibold uppercase tracking-wide text-faint">{g.label}</p>
                    <ul>
                      {g.items.map((w) => {
                        const on = selected.includes(w.weapon);
                        return (
                          <li key={w.weapon}>
                            <label className="flex h-[24px] cursor-pointer items-center gap-2 rounded-[5px] px-1 text-[12px] hover:bg-white/[0.03]">
                              <input type="checkbox" checked={on} onChange={() => toggle(w.weapon)} className="size-3.5 accent-[#e60023]" />
                              <span className={cn("flex-1 truncate", on ? "font-semibold text-white" : "text-fg-2")}>{w.weapon}</span>
                              <span className="tabular-nums text-[11px] text-faint">{formatInt(w.count)}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {!groups.length && <p className="py-3 text-center text-[12px] text-faint">Nenhuma arma encontrada.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
