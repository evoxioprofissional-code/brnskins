import type { Metadata } from "next";
import { AdminStock } from "@/components/admin/admin-stock";

export const metadata: Metadata = { title: "Estoque" };

export default function Page() {
  return <AdminStock />;
}
