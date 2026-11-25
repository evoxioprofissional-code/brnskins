import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL, REFERRAL_CODE_RE } from "@/config/referral";
import { getSupabaseAdmin } from "@/integrations/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Destino interno opcional (?to=/kits). Nunca redireciona para fora do site. */
const safeDestination = (to: string | null) => (to && to.startsWith("/") && !to.startsWith("//") ? to : "/");

/**
 * Link de indicação: /r/<code>
 * Registra a visita (uma por visitante a cada 30 min), guarda a indicação em
 * cookie por 30 dias e leva o visitante para a loja.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toLowerCase();
  const destination = new URL(safeDestination(request.nextUrl.searchParams.get("to")), request.url);
  const response = NextResponse.redirect(destination);

  const db = getSupabaseAdmin();
  if (!db || !REFERRAL_CODE_RE.test(code)) return response;

  const { data: influencer } = await db.from("influencers").select("id").eq("code", code).eq("active", true).maybeSingle();
  if (!influencer) return response;

  const existing = request.cookies.get(REFERRAL.visitorCookie)?.value;
  const visitorId = existing && UUID_RE.test(existing) ? existing : crypto.randomUUID();
  const secure = process.env.NODE_ENV === "production";

  const since = new Date(Date.now() - REFERRAL.visitDedupeMinutes * 60_000).toISOString();
  const { count } = await db
    .from("referral_visits")
    .select("id", { count: "exact", head: true })
    .eq("influencer_id", influencer.id)
    .eq("visitor_id", visitorId)
    .gte("landed_at", since);
  if (!count) await db.from("referral_visits").insert({ influencer_id: influencer.id, visitor_id: visitorId });

  response.cookies.set(REFERRAL.visitorCookie, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  response.cookies.set(REFERRAL.refCookie, code, {
    httpOnly: false, // a loja lê para mostrar a indicação na mensagem do pedido
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * REFERRAL.attributionDays,
  });
  return response;
}
