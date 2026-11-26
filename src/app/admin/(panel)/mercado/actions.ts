"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { clearCatalogCache } from "@/services/catalog/supabase-catalog-repository";
import { MARKET_SOURCES } from "@/services/market-sync/sources";
import { syncMarketCatalog } from "@/services/market-sync/sync";

export type MarketActionResult = { ok: true; message: string } | { ok: false; error: string };

const pricingSchema = z.object({
  source: z.enum(MARKET_SOURCES),
  /** "usd" = US$ × dólar × margem · "cny" = ¥ × cotação do revendedor */
  mode: z.enum(["usd", "cny"]).default("usd"),
  marginPct: z.number({ message: "Informe a margem" }).min(-50, "Mínimo -50%").max(300, "Máximo 300%"),
  /** R$ por ¥ (ex.: 0,82) — só no modo "cny" */
  cnyRate: z.number().min(0.1, "Cotação mínima R$ 0,10").max(5, "Cotação máxima R$ 5,00").optional(),
});

function refreshStore() {
  clearCatalogCache();
  revalidatePath("/", "layout");
}

export async function savePricingRule(raw: z.input<typeof pricingSchema>): Promise<MarketActionResult> {
  if (!(await isAdminRequest())) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Supabase não configurado no servidor." };
  const parsed = pricingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { data: current } = await db.from("settings").select("value").eq("key", "pricing").maybeSingle();
  if (parsed.data.mode === "cny" && !parsed.data.cnyRate) return { ok: false, error: "Informe a cotação (R$ por ¥)" };
  const value = {
    ...(current?.value ?? {}),
    source: parsed.data.source,
    mode: parsed.data.mode,
    margin_pct: parsed.data.marginPct,
    ...(parsed.data.cnyRate ? { cny_rate: parsed.data.cnyRate } : {}),
  };
  const { error } = await db.from("settings").upsert({ key: "pricing", value, is_public: false });
  if (error) return { ok: false, error: "Não foi possível salvar a regra." };
  const { data: count, error: repriceError } = await db.rpc("reprice_market_offers");
  if (repriceError) return { ok: false, error: "Regra salva, mas o recálculo falhou." };
  refreshStore();
  return { ok: true, message: `Preços recalculados (${Number(count).toLocaleString("pt-BR")} ofertas)` };
}

export async function runCatalogSync(): Promise<MarketActionResult> {
  if (!(await isAdminRequest())) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Supabase não configurado no servidor." };
  try {
    const r = await syncMarketCatalog(db);
    refreshStore();
    return { ok: true, message: `Sincronizado: ${r.skins.toLocaleString("pt-BR")} skins e ${r.priced.toLocaleString("pt-BR")} ofertas` };
  } catch (err) {
    return { ok: false, error: `Falha na sincronização: ${err instanceof Error ? err.message : "erro desconhecido"}` };
  }
}
