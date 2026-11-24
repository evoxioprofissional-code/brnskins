import type { Metadata } from "next";
import { AdminMovements } from "@/components/admin/admin-movements";

export const metadata: Metadata = { title: "Movimentações" };

export default function Page() {
  return <AdminMovements />;
}
