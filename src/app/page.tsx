import { HeroBanner } from "@/components/home/hero-banner";
import { CatalogDataProvider } from "@/components/catalog/catalog-data-provider";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getCatalogRepository } from "@/services/catalog";

export default async function HomePage() {
  const repo = getCatalogRepository();
  const [skins, kits] = await Promise.all([repo.listSkins(), repo.listKits()]);

  return (
    <main>
      <HeroBanner />
      <CatalogDataProvider skins={skins} kits={kits} source={repo.source}>
        <CatalogView />
      </CatalogDataProvider>
    </main>
  );
}
