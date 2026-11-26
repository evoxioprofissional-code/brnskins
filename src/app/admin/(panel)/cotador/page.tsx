import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminQuote } from "@/components/admin/admin-quote";
import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { isAdminRequest } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Cotador" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const db = getSupabaseAdmin();
  const { data } = db ? await db.from("settings").select("value").eq("key", "pricing").maybeSingle() : { data: null };
  const v = (data?.value ?? {}) as { usd_brl?: number; usd_cny?: number; cny_rate?: number; margin_pct?: number };
  const usdBrl = Number(v.usd_brl) || 0;
  const usdCny = Number(v.usd_cny) || 0;
  const yuanToday = usdBrl && usdCny ? usdBrl / usdCny : 0;
  const storeRate = Number(v.cny_rate) || (yuanToday ? Math.round(yuanToday * (1 + (Number(v.margin_pct) || 0) / 100) * 100) / 100 : 0.85);
  return <AdminQuote yuanToday={yuanToday} storeRate={storeRate} configured={Boolean(db && usdCny)} />;
}
