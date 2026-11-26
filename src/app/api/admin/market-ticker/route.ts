import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { isAdminRequest } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

/** Painel de mercado da barra do topo: câmbio, cotação da loja e última sincronização. */
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ configured: false });
  const [pricing, sync] = await Promise.all([
    db.from("settings").select("value").eq("key", "pricing").maybeSingle(),
    db.from("settings").select("value").eq("key", "catalog_sync").maybeSingle(),
  ]);
  const p = (pricing.data?.value ?? {}) as { usd_brl?: number; usd_cny?: number; cny_rate?: number; mode?: string; source?: string; margin_pct?: number };
  const s = (sync.data?.value ?? {}) as { finishedAt?: string; skins?: number; priced?: number };
  const usdBrl = Number(p.usd_brl) || 0;
  const usdCny = Number(p.usd_cny) || 0;
  return NextResponse.json({
    configured: true,
    usdBrl,
    cnyBrl: usdBrl && usdCny ? usdBrl / usdCny : 0,
    mode: p.mode ?? "usd",
    cnyRate: Number(p.cny_rate) || null,
    marginPct: Number(p.margin_pct) || 0,
    source: p.source ?? "buff163",
    syncedAt: s.finishedAt ?? null,
    items: s.skins ?? 0,
  });
}
