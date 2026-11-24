import type { Metadata } from "next";
import { AdminCategories } from "@/components/admin/admin-catalog-meta";

export const metadata: Metadata = { title: "Categorias" };

export default function Page() {
  return <AdminCategories />;
}
