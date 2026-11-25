import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { EMPTY_STATS, type ReferralDashboard, type ReferralPeriod } from "./types";

/** Somente no servidor e depois de validar a sessão do admin. */
export async function loadReferralDashboard(period: ReferralPeriod): Promise<ReferralDashboard> {
  const db = getSupabaseAdmin();
  if (!db) return { configured: false, period, influencers: [], conversions: [] };

  const since = period === "all" ? null : new Date(Date.now() - Number(period) * 86_400_000).toISOString();
  const [inf, stats, conv] = await Promise.all([
    db.from("influencers").select("*").order("created_at", { ascending: true }),
    db.rpc("influencer_stats", { p_since: since }),
    db.from("referral_conversions").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  if (inf.error || stats.error || conv.error) throw new Error(inf.error?.message ?? stats.error?.message ?? conv.error?.message);

  const byId = new Map(
    (stats.data as Record<string, string | number>[]).map((r) => [
      String(r.influencer_id),
      {
        visitors: Number(r.visitors),
        visits: Number(r.visits),
        conversions: Number(r.conversions),
        revenue: Number(r.revenue),
        commissionPending: Number(r.commission_pending),
        commissionApproved: Number(r.commission_approved),
        commissionPaid: Number(r.commission_paid),
      },
    ]),
  );

  return {
    configured: true,
    period,
    influencers: inf.data.map((i) => ({
      id: i.id,
      name: i.name,
      code: i.code,
      commissionRate: Number(i.commission_rate),
      active: i.active,
      contact: i.contact,
      pixKey: i.pix_key,
      notes: i.notes,
      createdAt: i.created_at,
      stats: byId.get(i.id) ?? EMPTY_STATS,
    })),
    conversions: conv.data.map((c) => ({
      id: c.id,
      influencerId: c.influencer_id,
      source: c.source,
      reference: c.reference,
      amount: Number(c.amount),
      commissionRate: Number(c.commission_rate),
      commission: Number(c.commission),
      status: c.status,
      createdAt: c.created_at,
    })),
  };
}
