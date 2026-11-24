import type { Metadata } from "next";
import { InspectStudio } from "@/components/inspect/inspect-studio";
import { getCatalogRepository } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Inspect 3D",
  description: "Inspecione skins de CS2 em 3D: float, pattern, adesivos, amuletos, luvas, agentes e mapas.",
};

export default async function InspectPage() {
  const skins = await getCatalogRepository().listSkins();
  return <InspectStudio skins={skins} />;
}
