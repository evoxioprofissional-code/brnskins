import type { Metadata } from "next";
import { AdminSkins } from "@/components/admin/admin-skins";

export const metadata: Metadata = { title: "Skins" };

export default function Page() {
  return <AdminSkins />;
}
