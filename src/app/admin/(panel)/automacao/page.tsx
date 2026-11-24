import type { Metadata } from "next";
import { AdminAutomation } from "@/components/admin/admin-automation";

export const metadata: Metadata = { title: "Automação" };

export default function Page() {
  return <AdminAutomation />;
}
