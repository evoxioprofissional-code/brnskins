import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminMarket, type MarketPageData } from "@/components/admin/admin-market";
import { getSupabaseAdmin } from "@/integrations/supabase/server";
import { isAdminRequest } from "@/lib/admin-guard";

export const metadata: Metadata = { title: "Preços de mercado" };
export const dynamic = "force-dynamic";

const SAMPLES = [
  "AK-47 | Redline (Field-Tested)",
  "AWP | Asiimov (Field-Tested)",
  "★ Karambit | Doppler (Factory New)",
  "★ Butterfly Knife | Fade (Factory New)",
  "★ Sport Gloves | Vice (Field-Tested)",
];

export default async function Page() {
  if (!(await isAdminRequest())) redirect("/admin/login");
  const db = getSupabaseAdmin();
  if (!db) return <AdminMarket data={{ configured: false, pricing: null, sync: null, samples: [] }} />;

  const [pricing, sync, samples] = await Promise.all([
    db.from("settings").select("value").eq("key", "pricing").maybeSingle(),
    db.from("settings").select("value").eq("key", "catalog_sync").maybeSingle(),
    db.from("market_offers").select("market_hash_name, usd, base_source, price_brl, steam_brl").in("market_hash_name", SAMPLES),
  ]);

  const data: MarketPageData = {
    configured: true,
    pricing: pricing.data?.value ?? null,
    sync: sync.data?.value && Object.keys(sync.data.value).length ? sync.data.value : null,
    samples: (samples.data ?? [])
      .sort((a, b) => SAMPLES.indexOf(a.market_hash_name) - SAMPLES.indexOf(b.market_hash_name))
      .map((r) => ({
        name: r.market_hash_name,
        usd: r.usd ?? {},
        baseSource: r.base_source,
        priceBrl: r.price_brl == null ? null : Number(r.price_brl),
        steamBrl: r.steam_brl == null ? null : Number(r.steam_brl),
      })),
  };
  return <AdminMarket data={data} />;
}
