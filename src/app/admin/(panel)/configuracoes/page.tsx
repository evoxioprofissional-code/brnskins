import type { Metadata } from "next";
import { AdminStoreSettings } from "@/components/admin/admin-settings";

export const metadata: Metadata = { title: "Configurações" };

export default function Page() {
  return <AdminStoreSettings />;
}
