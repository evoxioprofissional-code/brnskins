import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, getAdminConfig, verifySessionToken } from "@/lib/admin-session";
import { AdminDataProvider } from "@/components/admin/admin-data-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { demoCatalogRepository } from "@/services/catalog/demo-catalog-repository";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin BRN Skins" }, robots: { index: false } };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Segunda camada de proteção (além do middleware).
  const { secret, enabled } = getAdminConfig();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!enabled || !(await verifySessionToken(token, secret))) redirect("/admin/login");

  // Módulos do painel (estoque, financeiro...) ainda são demonstrativos e usam
  // o catálogo de exemplo. O catálogo real é gerido em /admin/mercado.
  const repo = demoCatalogRepository;
  const [skins, kits] = await Promise.all([repo.listSkins(), repo.listKits()]);

  return (
    <AdminDataProvider skins={skins} kits={kits} source={repo.source}>
      <AdminShell>{children}</AdminShell>
    </AdminDataProvider>
  );
}
