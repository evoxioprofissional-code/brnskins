export type ReferralStatus = "pending" | "approved" | "paid" | "canceled";
export type ReferralSource = "order" | "upgrade";

export interface Influencer {
  id: string;
  name: string;
  code: string;
  commissionRate: number;
  active: boolean;
  contact: string | null;
  pixKey: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InfluencerStats {
  visitors: number;
  visits: number;
  conversions: number;
  revenue: number;
  commissionPending: number;
  commissionApproved: number;
  commissionPaid: number;
}

export interface ReferralConversion {
  id: string;
  influencerId: string;
  source: ReferralSource;
  reference: string;
  amount: number;
  commissionRate: number;
  commission: number;
  status: ReferralStatus;
  createdAt: string;
}

export type ReferralPeriod = "7" | "30" | "all";

export interface ReferralDashboard {
  configured: boolean;
  period: ReferralPeriod;
  influencers: (Influencer & { stats: InfluencerStats })[];
  conversions: ReferralConversion[];
}

export const EMPTY_STATS: InfluencerStats = {
  visitors: 0,
  visits: 0,
  conversions: 0,
  revenue: 0,
  commissionPending: 0,
  commissionApproved: 0,
  commissionPaid: 0,
};
