import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { safeEqual } from "@/lib/admin-session";
import { clearCatalogCache } from "@/services/catalog/supabase-catalog-repository";
import { syncMarketCatalog } from "@/services/market-sync/sync";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Sincronização diária do catálogo e dos preços.
 * Chame com o cabeçalho `Authorization: Bearer <CRON_SECRET>`
 * (cron da hospedagem ou `npm run catalog:sync`).
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization") ?? "";
  if (secret.length < 24 || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });
  try {
    const result = await syncMarketCatalog(db);
    clearCatalogCache();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "sync_failed" }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
