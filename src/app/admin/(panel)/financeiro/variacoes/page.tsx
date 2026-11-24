import type { Metadata } from "next";
import { AdminVariations } from "@/components/admin/admin-finance";

export const metadata: Metadata = { title: "Baixas e altas" };

export default function Page() {
  return <AdminVariations />;
}
