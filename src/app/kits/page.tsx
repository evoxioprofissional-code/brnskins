import type { Metadata } from "next";
import { CatalogDataProvider } from "@/components/catalog/catalog-data-provider";
import { KitsView } from "@/components/kits/kits-view";
import { PageContainer, PageHeading } from "@/components/layout/page-container";
import { getCatalogRepository } from "@/services/catalog";

export const metadata: Metadata = { title: "Kits" };

export default async function KitsPage() {
  const repo = getCatalogRepository();
  const [skins, kits] = await Promise.all([repo.listSkins(), repo.listKits()]);
  return (
    <PageContainer>
      <PageHeading
        eyebrow="Kits"
        title="Kits de skins"
        description="Combinações prontas com preço especial. Veja cada item e adicione o conjunto completo ao carrinho."
      />
      <CatalogDataProvider skins={skins} kits={kits} source={repo.source}>
        <KitsView />
      </CatalogDataProvider>
    </PageContainer>
  );
}
