import type { Metadata } from "next";
import { AdminWhatsApp } from "@/components/admin/admin-settings";

export const metadata: Metadata = { title: "WhatsApp" };

export default function Page() {
  return <AdminWhatsApp />;
}
