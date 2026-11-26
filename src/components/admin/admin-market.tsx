"use client";

import { useMemo, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { runCatalogSync, savePricingRule, type MarketActionResult } from "@/app/admin/(panel)/mercado/actions";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import { timeAgo } from "@/lib/admin-metrics";
import { MARKET_LABELS, MARKET_SOURCES, type MarketSource } from "@/services/market-sync/sources";

export interface MarketPageData {
  configured: boolean;
  pricing: { source?: MarketSource; margin_pct?: number; usd_brl?: number } | null;
  sync: {
    skins: number;
    offers: number;
    priced: number;
    usdBrl: number;
    sources: Record<MarketSource, number>;
    finishedAt: string;
    durationMs: number;
  } | null;
  samples: { name: string; usd: Partial<Record<MarketSource, number>>; baseSource: string | null; priceBrl: number | null; steamBrl: number | null }[];
}

const FALLBACK: MarketSource[] = ["buff163", "c5game", "csfloat", "skinport", "steam"];
const pick = (usd: Partial<Record<MarketSource, number>>, preferred: MarketSource) => {
  for (const s of [preferred, ...FALLBACK]) if (usd[s] && usd[s]! > 0) return { src: s, usd: usd[s]! };
  return null;
};

function useAction() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<MarketActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast(r.message);
      else toast(r.error, "error");
    });
  return { pending, run };
}

export function AdminMarket({ data }: { data: MarketPageData }) {
  const sync = useAction();
  const save = useAction();
  const rate = data.pricing?.usd_brl ?? data.sync?.usdBrl ?? 0;
  const [source, setSource] = useState<MarketSource>(data.pricing?.source ?? "buff163");
  const [margin, setMargin] = useState(String(data.pricing?.margin_pct ?? 8));
  const marginNum = Number(margin.replace(",", "."));
  const dirty = source !== (data.pricing?.source ?? "buff163") || marginNum !== (data.pricing?.margin_pct ?? 8);

  const preview = useMemo(
    () =>
      data.samples.map((s) => {
        const p = pick(s.usd, source);
        const price = p && Number.isFinite(marginNum) ? Math.round(p.usd * rate * (1 + marginNum / 100) * 100) / 100 : null;
        return { ...s, src: p?.src ?? null, price };
      }),
    [data.samples, source, marginNum, rate],
  );

  if (!data.configured) {
    return <p className="card-premium p-6 text-[13.5px] text-muted">O Supabase não está configurado no servidor.</p>;
  }

  const total = data.sync?.priced ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[640px] text-[13px] text-muted">
          O catálogo e os preços são sincronizados todo dia a partir de fontes públicas e gratuitas. Aqui você define de qual mercado sai o preço
          base e a margem da loja.
        </p>
        <button
          type="button"
          disabled={sync.pending}
          onClick={() => sync.run(runCatalogSync)}
          className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-white/[0.12] px-4 text-[13px] font-medium text-fg-2 transition-colors hover:border-white/[0.24] hover:text-white disabled:opacity-60"
        >
          <RefreshCw size={14} className={cn(sync.pending && "animate-spin")} />
          {sync.pending ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Status da sincronização */}
        <section className="card-premium-red flex flex-col p-6 xl:col-span-5">
          <p className="text-[13px] font-medium text-[#ffb3be]">Catálogo sincronizado</p>
          <p className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.03em]">{formatInt(data.sync?.skins ?? 0)}</p>
          <p className="mt-2 text-[12.5px] text-muted">
            skins · {formatInt(total)} ofertas com preço
            {data.sync && <> · atualizado {timeAgo(data.sync.finishedAt)}</>}
          </p>
          <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
            <div className="rounded-[14px] border border-white/[0.08] bg-black/25 p-3">
              <span className="text-[11.5px] text-muted">Dólar usado</span>
              <span className="mt-1 block text-[16px] font-semibold tabular-nums">R$ {rate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
            </div>
            <div className="rounded-[14px] border border-white/[0.08] bg-black/25 p-3">
              <span className="text-[11.5px] text-muted">Última duração</span>
              <span className="mt-1 block text-[16px] font-semibold tabular-nums">{data.sync ? `${(data.sync.durationMs / 1000).toFixed(0)}s` : "—"}</span>
            </div>
          </div>
        </section>

        {/* Cobertura por mercado */}
        <section className="card-premium p-5 xl:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Cobertura por mercado</h2>
            <span className="text-[12px] text-muted">ofertas com preço em cada fonte</span>
          </div>
          <ul className="mt-5 space-y-3.5">
            {MARKET_SOURCES.map((s) => {
              const n = data.sync?.sources[s] ?? 0;
              const pct = total ? (n / total) * 100 : 0;
              const active = s === source;
              return (
                <li key={s}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className={cn("flex items-center gap-2", active ? "font-semibold text-white" : "text-fg-2")}>
                      {MARKET_LABELS[s]}
                      {active && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#ff6b7d]">base</span>}
                    </span>
                    <span className="tabular-nums text-muted">
                      {formatInt(n)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: active ? "linear-gradient(90deg,#b5001b,#ff2d4b)" : "rgb(255 255 255 / 0.32)" }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Regra de preço */}
        <section className="card-premium p-5 xl:col-span-5">
          <h2 className="text-[15px] font-semibold">Regra de preço</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Preço na loja = preço do mercado base × dólar × (1 + margem). Sem preço no mercado base, usa o próximo disponível.
          </p>

          <p className="mb-2 mt-5 text-[12.5px] font-medium text-fg-2">Mercado base</p>
          <div role="radiogroup" aria-label="Mercado base" className="flex flex-wrap gap-1.5">
            {MARKET_SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                onClick={() => setSource(s)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-[12.5px] font-medium transition-colors",
                  source === s ? "bg-white text-black" : "border border-white/[0.1] text-fg-2 hover:border-white/[0.22] hover:text-white",
                )}
              >
                {MARKET_LABELS[s]}
              </button>
            ))}
          </div>

          <label className="mt-5 block">
            <span className="text-[12.5px] font-medium text-fg-2">Margem da loja (%)</span>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={-20}
                max={50}
                step={1}
                value={Number.isFinite(marginNum) ? Math.max(-20, Math.min(50, marginNum)) : 0}
                onChange={(e) => setMargin(e.target.value)}
                aria-label="Margem (controle deslizante)"
                className="studio-range flex-1"
                style={{ background: `linear-gradient(90deg,#e60023 ${((Math.max(-20, Math.min(50, marginNum || 0)) + 20) / 70) * 100}%, rgb(255 255 255 / 0.08) 0)` }}
              />
              <input
                inputMode="decimal"
                value={margin}
                onChange={(e) => setMargin(e.target.value.replace(/[^\d.,-]/g, ""))}
                aria-label="Margem da loja (%)"
                className="h-9 w-[72px] rounded-[10px] border border-white/[0.1] bg-black/30 px-2 text-center text-[13.5px] font-semibold outline-none focus:border-primary/60"
              />
            </div>
          </label>

          <button
            type="button"
            disabled={!dirty || save.pending || !Number.isFinite(marginNum)}
            onClick={() => save.run(() => savePricingRule({ source, marginPct: marginNum }))}
            className="mt-6 h-10 w-full rounded-full bg-primary text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            {save.pending ? "Recalculando..." : dirty ? "Aplicar e recalcular preços" : "Regra aplicada"}
          </button>
        </section>

        {/* Prévia */}
        <section className="card-premium p-5 xl:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Prévia de preços</h2>
            <span className="text-[12px] text-muted">{dirty ? "com a regra nova" : "como está na loja"}</span>
          </div>
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {preview.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <div className="min-w-[200px] flex-1">
                  <p className="text-[13px] font-medium">{s.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-faint">
                    {MARKET_SOURCES.filter((m) => s.usd[m]).map((m) => (
                      <span key={m} className={m === s.src ? "text-fg-2" : ""}>
                        {MARKET_LABELS[m]} ${s.usd[m]!.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-semibold tabular-nums">{s.price != null ? formatBRL(s.price) : "—"}</p>
                  {s.steamBrl != null && <p className="text-[11px] text-faint">Steam {formatBRL(s.steamBrl)}</p>}
                </div>
              </li>
            ))}
            {!preview.length && <li className="py-8 text-center text-[13px] text-muted">Rode a primeira sincronização para ver a prévia.</li>}
          </ul>
        </section>
      </div>

      <p className="text-[11.5px] leading-relaxed text-faint">
        Fontes: catálogo do projeto aberto ByMykel/CSGO-API e preços dos arquivos públicos do CSGO Trader (sem garantia de funcionamento). Se uma
        fonte falhar, a loja mantém o último preço salvo.
      </p>
    </div>
  );
}
