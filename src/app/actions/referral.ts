"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { REFERRAL, REFERRAL_CODE_RE } from "@/config/referral";
import { getSupabaseAdmin } from "@/integrations/supabase/server";

const input = z.object({
  source: z.enum(["order", "upgrade"]),
  reference: z.string().regex(/^[A-Za-z0-9_-]{3,60}$/),
  amount: z.number().finite().min(0).max(10_000_000),
});

/**
 * Registra a comissão de um pedido/upgrade feito por um visitante indicado.
 * A indicação vem dos cookies gravados por /r/<code>. Entra como "pendente":
 * o admin aprova quando a venda se confirma.
 */
export async function trackReferralConversion(raw: z.infer<typeof input>): Promise<{ ok: boolean }> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const jar = await cookies();
  const code = jar.get(REFERRAL.refCookie)?.value?.toLowerCase();
  const visitorId = jar.get(REFERRAL.visitorCookie)?.value ?? null;
  if (!code || !REFERRAL_CODE_RE.test(code)) return { ok: false };

  const db = getSupabaseAdmin();
  if (!db) return { ok: false };
  const { data: influencer } = await db
    .from("influencers")
    .select("id, commission_rate")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (!influencer) return { ok: false };

  if (visitorId) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await db
      .from("referral_conversions")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", visitorId)
      .gte("created_at", since);
    if ((count ?? 0) >= REFERRAL.maxConversionsPerVisitorPerDay) return { ok: false };
  }

  const rate = Number(influencer.commission_rate);
  const amount = Math.round(parsed.data.amount * 100) / 100;
  const { error } = await db.from("referral_conversions").upsert(
    {
      influencer_id: influencer.id,
      visitor_id: visitorId,
      source: parsed.data.source,
      reference: parsed.data.reference,
      amount,
      commission_rate: rate,
      commission: Math.round(amount * rate) / 100,
    },
    { onConflict: "influencer_id,source,reference", ignoreDuplicates: true },
  );
  return { ok: !error };
}
