"use client";

import { useEffect, useMemo } from "react";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useFilteredSkins } from "@/hooks/use-filtered-skins";
import { useHydrated } from "@/hooks/use-hydrated";
import type { CatalogFilters } from "@/types/filters";
import { SkinDetailsDrawer } from "@/components/product/skin-details-drawer";
import { useCatalogData } from "./catalog-data-provider";
import { CatalogTabs } from "./catalog-tabs";
import { CatalogToolbar } from "./catalog-toolbar";
import { FiltersPanel } from "./filters-panel";
import { MobileFiltersSheet } from "./mobile-filters-sheet";
import { SkinCollection } from "./skin-collection";
import { InspectPanel, InventoryPanel, UpgradesPanel } from "./tab-panels";

const countActive = (f: CatalogFilters) =>
  (f.minPrice !== null ? 1 : 0) +
  (f.maxPrice !== null ? 1 : 0) +
  (f.category !== "all" ? 1 : 0) +
  f.wears.length +
  f.rarities.length +
  f.colors.length +
  (f.edition !== "all" ? 1 : 0) +
  (f.stattrak !== "all" ? 1 : 0) +
  (f.souvenir !== "all" ? 1 : 0);

export function CatalogView() {
  const { skins, source } = useCatalogData();
  const hydrated = useHydrated();
  const tab = useCatalogStore((s) => s.tab);
  const filters = useCatalogStore((s) => s.filters);
  const sort = useCatalogStore((s) => s.sort);
  const mobileOpen = useCatalogStore((s) => s.mobileFiltersOpen);
  const setMobileOpen = useCatalogStore((s) => s.setMobileFiltersOpen);
  const closeSkin = useCatalogStore((s) => s.closeSkin);
  const favIds = useFavoritesStore((s) => s.ids);

  // O drawer nunca permanece aberto ao sair da página do catálogo.
  useEffect(() => () => closeSkin(), [closeSkin]);

  const visible = useFilteredSkins(skins, filters, sort);
  const favorites = useMemo(
    () => (hydrated ? visible.filter((s) => favIds.includes(s.id)) : []),
    [visible, favIds, hydrated],
  );
  const showsGrid = tab === "catalog" || tab === "favorites";

  return (
    <>
      <section id="catalogo" className="scroll-mt-16 px-3 pb-8 pt-4 lg:pl-[40px] lg:pr-[24px] lg:pt-[15px]">
        <CatalogTabs />

        <div className="mt-3 flex items-start gap-[20px] lg:mt-[16px]">
          <aside
            aria-label="Filtros"
            className="panel sticky top-[83px] hidden max-h-[calc(100dvh-99px)] w-[232px] shrink-0 overflow-y-auto scrollbar-thin lg:block"
          >
            <FiltersPanel />
          </aside>

          <div className="min-w-0 flex-1">
            {showsGrid && (
              <>
                <CatalogToolbar onOpenFilters={() => setMobileOpen(true)} activeFilterCount={countActive(filters)} />
                <div className="mt-3 lg:mt-[14px]">
                  {tab === "catalog" ? (
                    <SkinCollection skins={visible} />
                  ) : (
                    <SkinCollection
                      skins={favorites}
                      emptyTitle="Nenhum favorito ainda"
                      emptyText="Toque na estrela de uma skin para salvá-la aqui."
                    />
                  )}
                </div>
              </>
            )}
            {tab === "inventory" && <InventoryPanel />}
            {tab === "upgrades" && <UpgradesPanel />}
            {tab === "inspect" && <InspectPanel />}
          </div>
        </div>

        {source.isDemo && (
          <p className="mt-8 text-center text-[11.5px] text-faint">
            {source.label}. Valores exibidos apenas para demonstração da interface.
          </p>
        )}
      </section>

      <MobileFiltersSheet open={mobileOpen} onClose={() => setMobileOpen(false)} resultCount={visible.length} />
      <SkinDetailsDrawer />
    </>
  );
}
