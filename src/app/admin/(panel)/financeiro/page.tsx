import type { Metadata } from "next";
import { AdminFinance } from "@/components/admin/admin-finance";

export const metadata: Metadata = { title: "Financeiro" };

export default function Page() {
  return <AdminFinance />;
}
