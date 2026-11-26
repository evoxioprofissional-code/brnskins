import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { parseLine, type QuoteItem } from "@/lib/quote";

export const dynamic = "force-dynamic";

async function rates(db: SupabaseClient) {
  const { data } = await db.from("settings").select("value").eq("key", "pricing").maybeSingle();
  const v = (data?.value ?? {}) as { usd_cny?: number; usd_brl?: number; cny_rate?: number; mode?: string; source?: string };
  return { usdCny: Number(v.usd_cny) || 0, usdBrl: Number(v.usd_brl) || 0, storeCnyRate: Number(v.cny_rate) || null };
}

type Row = {
  skin_id: string;
  wear: string;
  variant: string;
  market_hash_name: string;
  usd: Record<string, number>;
  steam_brl: number | null;
  market_skins: { image_url: string } | { image_url: string }[] | null;
};

function toItem(r: Row, usdCny: number): QuoteItem {
  const skin = Array.isArray(r.market_skins) ? r.market_skins[0] : r.market_skins;
  const cny = (v?: number) => (v && usdCny ? Math.round(v * usdCny * 100) / 100 : null);
  return {
    key: `${r.skin_id}:${r.wear}:${r.variant}`,
    skinId: r.skin_id,
    name: r.market_hash_name,
    image: skin?.image_url ?? "",
    wear: r.wear,
    variant: r.variant,
    buffCny: cny(r.usd?.buff163),
    c5Cny: cny(r.usd?.c5game),
    steamBrl: r.steam_brl == null ? null : Number(r.steam_brl),
  };
}

async function search(db: SupabaseClient, p: { tokens: string[]; wear?: string | null; variant?: string | null }, limit: number) {
  let query = db
    .from("market_offers")
    .select("skin_id, wear, variant, market_hash_name, usd, steam_brl, market_skins!inner(image_url, active)")
    .eq("market_skins.active", true)
    .limit(limit);
  for (const t of p.tokens) query = query.ilike("market_hash_name", `%${t}%`);
  if (p.wear) query = query.eq("wear", p.wear);
  if (p.variant) query = query.eq("variant", p.variant);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  // Nomes mais curtos primeiro (o mais próximo do que foi digitado)
  return ((data ?? []) as unknown as Row[]).sort((a, b) => a.market_hash_name.length - b.market_hash_name.length);
}

async function guard() {
  if (!(await isAdminRequest())) return null;
  return getSupabaseAdmin();
}

/** GET /api/admin/quote?q=karambit tiger → sugestões */
export async function GET(request: NextRequest) {
  const db = await guard();
  if (!db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 120);
  const parsed = parseLine(q);
  const r = await rates(db);
  if (!parsed.tokens.length) return NextResponse.json({ items: [], ...r });
  try {
    const rows = await search(db, { tokens: parsed.tokens, wear: parsed.wear, variant: parsed.variant === "normal" ? null : parsed.variant }, 60);
    return NextResponse.json({ items: rows.slice(0, 25).map((x) => toItem(x, r.usdCny)), ...r });
  } catch {
    return NextResponse.json({ error: "query_failed" }, { status: 502 });
  }
}

const bodySchema = z.object({ lines: z.array(z.string().max(160)).max(60) });

/** POST /api/admin/quote { lines: [...] } → melhor item para cada linha colada */
export async function POST(request: NextRequest) {
  const db = await guard();
  if (!db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const r = await rates(db);
  const results = await Promise.all(
    parsed.data.lines
      .map((l) => l.trim())
      .filter(Boolean)
      .map(async (line) => {
        const p = parseLine(line);
        if (!p.tokens.length) return { line, item: null };
        try {
          const rows = await search(db, { tokens: p.tokens, wear: p.wear ?? "FT", variant: p.variant }, 10);
          // Sem desgaste na linha: tenta FT e, se não houver, qualquer condição
          const best = rows[0] ?? (p.wear ? undefined : (await search(db, { tokens: p.tokens, variant: p.variant }, 10))[0]);
          return { line, item: best ? toItem(best, r.usdCny) : null };
        } catch {
          return { line, item: null };
        }
      }),
  );
  return NextResponse.json({ results, ...r });
}
