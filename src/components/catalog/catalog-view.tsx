"use client";

import { useEffect, useMemo } from "react";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCatalogItems, useCatalogPage } from "@/hooks/use-catalog-page";
import { CATALOG_PAGE_SIZE, DEFAULT_QUERY, applyFilters, queryToParams } from "@/lib/catalog-query";
import type { CatalogFilters } from "@/types/filters";
import { SkinDetailsDrawer } from "@/components/product/skin-details-drawer";
import { UpgradeLab } from "@/components/upgrade/upgrade-lab";
import { useCatalogData } from "./catalog-data-provider";
import { CatalogTabs } from "./catalog-tabs";
import { CatalogToolbar } from "./catalog-toolbar";
import { FiltersPanel } from "./filters-panel";
import { MobileFiltersSheet } from "./mobile-filters-sheet";
import { Pagination } from "./pagination";
import { SkinCollection } from "./skin-collection";
import { InspectPanel, InventoryPanel } from "./tab-panels";

const countActive = (f: CatalogFilters) =>
  (f.minPrice !== null ? 1 : 0) +
  (f.maxPrice !== null ? 1 : 0) +
  (f.category !== "all" ? 1 : 0) +
  f.weapons.length +
  f.wears.length +
  f.rarities.length +
  f.colors.length +
  (f.edition !== "all" ? 1 : 0) +
  (f.stattrak !== "all" ? 1 : 0) +
  (f.souvenir !== "all" ? 1 : 0);

const INITIAL_KEY = queryToParams(DEFAULT_QUERY).toString();

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(172px,1fr))] lg:gap-[12px]" aria-busy="true">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="h-[248px] animate-pulse rounded-[12px] border border-[#18191d] bg-[#0b0c0f]" />
      ))}
    </div>
  );
}

export function CatalogView() {
  const { source, initialPage, adjust } = useCatalogData();
  const hydrated = useHydrated();
  const tab = useCatalogStore((s) => s.tab);
  const filters = useCatalogStore((s) => s.filters);
  const sort = useCatalogStore((s) => s.sort);
  const page = useCatalogStore((s) => s.page);
  const setPage = useCatalogStore((s) => s.setPage);
  const mobileOpen = useCatalogStore((s) => s.mobileFiltersOpen);
  const setMobileOpen = useCatalogStore((s) => s.setMobileFiltersOpen);
  const closeSkin = useCatalogStore((s) => s.closeSkin);
  const favIds = useFavoritesStore((s) => s.ids);

  // O drawer nunca permanece aberto ao sair da página do catálogo.
  useEffect(() => () => closeSkin(), [closeSkin]);

  const query = useMemo(() => ({ filters, sort, page, pageSize: CATALOG_PAGE_SIZE }), [filters, sort, page]);
  const { data, loading, error } = useCatalogPage(query, { initial: initialPage, initialKey: INITIAL_KEY });
  const items = useMemo(() => adjust(data?.items ?? []), [adjust, data]);

  // Favoritos: busca só os itens salvos
  const favs = useCatalogItems({ ids: hydrated && tab === "favorites" ? favIds : [] });
  const favorites = useMemo(() => applyFilters(adjust(favs.items), filters), [adjust, favs.items, filters]);
  const showsGrid = tab === "catalog" || tab === "favorites";

  const goTo = (p: number) => {
    setPage(p);
    const el = document.getElementById("catalogo");
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section id="catalogo" className="scroll-mt-16 px-3 pb-8 pt-4 lg:pl-[40px] lg:pr-[24px] lg:pt-[15px]">
        <CatalogTabs />

        <div className="mt-3 flex items-start gap-[20px] lg:mt-[16px]">
          <aside
            aria-label="Filtros"
            hidden={tab === "upgrades"}
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
                    !data ? (
                      error ? (
                        <p className="panel px-6 py-16 text-center text-[13.5px] text-fg-2">Não foi possível carregar o catálogo agora. Tente novamente.</p>
                      ) : (
                        <GridSkeleton />
                      )
                    ) : (
                      <div className={loading ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
                        <SkinCollection skins={items} />
                        <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.pageSize} onChange={goTo} disabled={loading} />
                      </div>
                    )
                  ) : favs.loading && !favorites.length ? (
                    <GridSkeleton />
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
            {tab === "upgrades" && <UpgradeLab />}
            {tab === "inspect" && <InspectPanel />}
          </div>
        </div>

        {source.isDemo && (
          <p className="mt-8 text-center text-[11.5px] text-faint">
            {source.label}. Valores exibidos apenas para demonstração da interface.
          </p>
        )}
      </section>

      <MobileFiltersSheet open={mobileOpen} onClose={() => setMobileOpen(false)} resultCount={data?.total ?? 0} />
      <SkinDetailsDrawer />
    </>
  );
}
