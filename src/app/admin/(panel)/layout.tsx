import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, getAdminConfig, verifySessionToken } from "@/lib/admin-session";
import { AdminDataProvider } from "@/components/admin/admin-data-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCatalogRepository } from "@/services/catalog";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin BRN Skins" }, robots: { index: false } };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Segunda camada de proteção (além do middleware).
  const { secret, enabled } = getAdminConfig();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!enabled || !(await verifySessionToken(token, secret))) redirect("/admin/login");

  const repo = getCatalogRepository();
  const [skins, kits] = await Promise.all([repo.listSkins(), repo.listKits()]);

  return (
    <AdminDataProvider skins={skins} kits={kits} source={repo.source}>
      <AdminShell>{children}</AdminShell>
    </AdminDataProvider>
  );
}
