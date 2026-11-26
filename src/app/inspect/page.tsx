import type { Metadata } from "next";
import { InspectStudio } from "@/components/inspect/inspect-studio";
import { DEFAULT_QUERY } from "@/lib/catalog-query";
import { getCatalogRepository } from "@/services/catalog";
import { EMPTY_FILTERS } from "@/types/filters";

export const metadata: Metadata = {
  title: "Inspect 3D",
  description: "Inspecione skins de CS2 em 3D: float, pattern, adesivos, amuletos, luvas, agentes e mapas.",
};

export default async function InspectPage({ searchParams }: { searchParams: Promise<{ skin?: string }> }) {
  const { skin } = await searchParams;
  const repo = await getCatalogRepository();
  const page = (category: "rifle" | "gloves", pageSize: number) =>
    repo.queryCatalog({ ...DEFAULT_QUERY, filters: { ...EMPTY_FILTERS, category }, pageSize });
  // A busca do estúdio consulta /api/catalog; aqui vai só o necessário para abrir
  const [requested, featured, gloves] = await Promise.all([skin ? repo.getSkin(skin) : null, page("rifle", 24), page("gloves", 60)]);
  const skins = [...(requested ? [requested] : []), ...featured.items.filter((s) => s.id !== requested?.id)];
  return <InspectStudio skins={skins} gloves={gloves.items} />;
}
