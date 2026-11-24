import type { Metadata } from "next";
import { AdminPrices } from "@/components/admin/admin-prices";

export const metadata: Metadata = { title: "Preços" };

export default function Page() {
  return <AdminPrices />;
}
