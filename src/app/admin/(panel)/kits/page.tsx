import type { Metadata } from "next";
import { AdminKits } from "@/components/admin/admin-catalog-meta";

export const metadata: Metadata = { title: "Kits" };

export default function Page() {
  return <AdminKits />;
}
