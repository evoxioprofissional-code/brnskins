import { HeroBanner } from "@/components/home/hero-banner";
import { CatalogDataProvider } from "@/components/catalog/catalog-data-provider";
import { CatalogView } from "@/components/catalog/catalog-view";
import { DEFAULT_QUERY } from "@/lib/catalog-query";
import { getCatalogRepository } from "@/services/catalog";

// Catálogo e preços mudam no máximo uma vez por dia (sincronização)
export const revalidate = 600;

export default async function HomePage() {
  const repo = await getCatalogRepository();
  // Só a primeira página vai no HTML; as demais vêm de /api/catalog
  const [initialPage, kits] = await Promise.all([repo.queryCatalog(DEFAULT_QUERY), repo.listKits()]);

  return (
    <main>
      <HeroBanner />
      <CatalogDataProvider initialPage={initialPage} kits={kits} source={repo.source}>
        <CatalogView />
      </CatalogDataProvider>
    </main>
  );
}
