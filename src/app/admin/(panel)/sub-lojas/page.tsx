import type { Metadata } from "next";
import { AdminSubStores } from "@/components/admin/admin-substores";

export const metadata: Metadata = { title: "Sub-Lojas" };

export default function Page() {
  return <AdminSubStores />;
}
