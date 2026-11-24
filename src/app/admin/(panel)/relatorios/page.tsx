import type { Metadata } from "next";
import { AdminReports } from "@/components/admin/admin-reports";

export const metadata: Metadata = { title: "Relatórios" };

export default function Page() {
  return <AdminReports />;
}
