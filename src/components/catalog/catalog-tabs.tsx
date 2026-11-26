"use client";

import { Briefcase, Eye, Heart, LayoutGrid, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { useCatalogStore, type CatalogTab } from "@/stores/catalog-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCatalogSummary } from "./catalog-data-provider";

export function CatalogTabs() {
  const tab = useCatalogStore((s) => s.tab);
  const setTab = useCatalogStore((s) => s.setTab);
  const hydrated = useHydrated();
  const favCount = useFavoritesStore((s) => s.ids.length);
  const summary = useCatalogSummary();
  const catalogTotal = summary.counts.all ?? summary.total;

  const tabs: { id: CatalogTab; label: string; icon: typeof Heart; count?: number }[] = [
    { id: "catalog", label: "Catálogo", icon: LayoutGrid, count: catalogTotal },
    { id: "inventory", label: "Inventário", icon: Briefcase, count: 0 },
    { id: "favorites", label: "Favoritos", icon: Heart, count: hydrated ? favCount : 0 },
    { id: "upgrades", label: "Upgrades", icon: RefreshCw },
    { id: "inspect", label: "Inspecionar", icon: Eye },
  ];

  return (
    <div
      role="tablist"
      aria-label="Seções do catálogo"
      className="scrollbar-none -mx-3 flex gap-[8px] overflow-x-auto px-3 lg:mx-0 lg:gap-[16px] lg:overflow-visible lg:px-0"
    >
      {tabs.map((t) => {
        const active = t.id === tab;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex h-[32px] shrink-0 items-center gap-[6px] rounded-full border px-[13px] text-[12.5px] font-semibold lg:h-[35px] lg:gap-[8px] lg:rounded-[10px] lg:px-[17px] lg:text-[13px] tracking-[-0.01em] text-fg transition-colors",
              active
                ? "glow-active"
                : "border-[#1d1e23] bg-[linear-gradient(180deg,#0f1013,#0a0b0d)] hover:border-[#2c2d33]",
            )}
          >
            <Icon size={16} strokeWidth={2} aria-hidden />
            <span>
              {t.label}
              {t.count !== undefined && (
                <span className="ml-[4px] text-[12px] font-medium text-fg-2">({formatInt(t.count)})</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
