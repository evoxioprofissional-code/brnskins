import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminInfluencers } from "@/components/admin/admin-influencers";
import { isAdminRequest } from "@/lib/admin-guard";
import { loadReferralDashboard } from "@/services/referrals/repository";
import type { ReferralPeriod } from "@/services/referrals/types";

export const metadata: Metadata = { title: "Influenciadores" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  // Middleware e layout já protegem a rota; a página consulta o banco com a
  // chave secreta, então confere a sessão de novo antes de qualquer leitura.
  if (!(await isAdminRequest())) redirect("/admin/login");
  const { periodo } = await searchParams;
  const period: ReferralPeriod = periodo === "7" || periodo === "all" ? periodo : "30";
  const data = await loadReferralDashboard(period);
  return <AdminInfluencers data={data} />;
}
