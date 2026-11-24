import type { Metadata } from "next";
import { AdminBanners } from "@/components/admin/admin-settings";

export const metadata: Metadata = { title: "Banners" };

export default function Page() {
  return <AdminBanners />;
}
