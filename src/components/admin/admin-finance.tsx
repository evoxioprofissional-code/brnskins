"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BadgeDollarSign, BarChart3, Layers, Package, Search, TrendingDown, TrendingUp, Trophy, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import { cashFlow, dailySeries, financialSummary, lotVariationPct, priceVariation } from "@/lib/admin-metrics";
import { useAdminStore } from "@/stores/admin-store";
import { toast } from "@/components/ui/toaster";
import { AreaChart } from "./charts";
import { useSkinMap } from "./admin-hooks";
import { DemoNotice, KpiCard, Panel, SelectPill, Table } from "./admin-ui";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const dayLabel = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;

export function AdminFinance() {
  const movements = useAdminStore((s) => s.movements);
  const { map, name } = useSkinMap();
  const [days, setDays] = useState<"7" | "30" | "60">("30");
  const n = Number(days);
  const fin = useMemo(() => financialSummary(movements, n), [movements, n]);
  const series = useMemo(() => dailySeries(movements, n), [movements, n]);
  const flow = useMemo(() => cashFlow(movements, n), [movements, n]);
  const top = useMemo(() => {
    const since = Date.now() - n * 86_400_000;
    const agg = new Map<string, { revenue: number; profit: number; qty: number }>();
    for (const m of movements) {
      if (m.type !== "out" || !m.skinId || new Date(m.date).getTime() < since) continue;
      const a = agg.get(m.skinId) ?? { revenue: 0, profit: 0, qty: 0 };
      a.revenue += m.amount;
      a.profit += m.amount - (m.cost ?? 0);
      a.qty += m.quantity;
      agg.set(m.skinId, a);
    }
    return [...agg.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 8);
  }, [movements, n]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <DemoNotice>Valores calculados a partir das movimentações registradas (dados demonstrativos).</DemoNotice>
      </div>
      <div className="flex justify-end">
        <SelectPill label="Período" value={days} onChange={setDays} options={[{ id: "7", label: "Últimos 7 dias" }, { id: "30", label: "Últimos 30 dias" }, { id: "60", label: "Últimos 60 dias" }]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={`Faturamento (${n} dias)`} value={formatBRL(fin.revenue)} trend={fin.trend.revenue} icon={Wallet} />
        <KpiCard label="Lucro líquido" value={formatBRL(fin.profit)} trend={fin.trend.profit} icon={BadgeDollarSign} />
        <KpiCard label="Vendas" value={formatInt(fin.sales)} trend={fin.trend.sales} icon={Package} />
        <KpiCard label="Margem média" value={`${fin.margin.toFixed(1).replace(".", ",")}%`} trend={fin.trend.margin} icon={Layers} />
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          title="Faturamento x Lucro"
          icon={BarChart3}
          className="xl:col-span-8"
          actions={
            <span className="flex items-center gap-3 text-[12px] text-fg-2">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#ff1f3d]" />Faturamento</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#22c55e]" />Lucro</span>
            </span>
          }
        >
          <AreaChart
            ariaLabel={`Faturamento e lucro diários, ${n} dias`}
            height={280}
            labels={series.map((p) => dayLabel(p.date))}
            series={[
              { key: "rev2", label: "Faturamento", color: "#ff1f3d", values: series.map((p) => p.revenue) },
              { key: "pro2", label: "Lucro", color: "#22c55e", values: series.map((p) => p.profit) },
            ]}
          />
        </Panel>
        <Panel title="Fluxo de caixa" icon={Wallet} className="xl:col-span-4">
          <dl className="space-y-3 text-[13.5px]">
            <div className="flex justify-between"><dt className="text-fg-2">Vendas (saídas)</dt><dd className="font-semibold">{formatBRL(flow.sales)}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-2">Compras (entradas)</dt><dd className="font-semibold">{formatBRL(flow.purchases)}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-2">Custo das vendas</dt><dd className="font-semibold">{formatBRL(fin.revenue - fin.profit)}</dd></div>
            <div className="flex justify-between border-t border-[#17181c] pt-3 text-[15px]">
              <dt className="font-semibold">Caixa do período</dt>
              <dd className={cn("font-bold", flow.result >= 0 ? "text-[#3ee07a]" : "text-[#ff5a6e]")}>{flow.result >= 0 ? "+" : "-"} {formatBRL(Math.abs(flow.result))}</dd>
            </div>
            <div className="flex justify-between text-[12.5px] text-fg-2"><dt>Ticket médio</dt><dd>{formatBRL(fin.sales ? fin.revenue / fin.sales : 0)}</dd></div>
          </dl>
        </Panel>
      </div>
      <Panel title="Skins mais lucrativas" icon={Trophy}>
        <Table head={["Skin", "Vendidas", "Faturamento", "Lucro", "Margem"]}>
          {top.map(([id, a]) => (
            <tr key={id}>
              <td>
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-12 shrink-0">{map.get(id) && <Image src={map.get(id)!.image} alt="" fill sizes="48px" className="object-contain" />}</div>
                  <span className="font-semibold">{name(id)}</span>
                </div>
              </td>
              <td>{formatInt(a.qty)}</td>
              <td>{formatBRL(a.revenue)}</td>
              <td className="font-semibold text-[#3ee07a]">{formatBRL(a.profit)}</td>
              <td className="text-fg-2">{a.revenue ? ((a.profit / a.revenue) * 100).toFixed(1).replace(".", ",") : 0}%</td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

export function AdminVariations() {
  const stock = useAdminStore((s) => s.stock);
  const setPrice = useAdminStore((s) => s.setLotMarketPrice);
  const { map, name } = useSkinMap();
  const [filter, setFilter] = useState<"all" | "up" | "down">("all");
  const [q, setQ] = useState("");
  const v = useMemo(() => priceVariation(stock), [stock]);
  const list = useMemo(
    () =>
      stock
        .filter((l) => (filter === "up" ? l.marketPrice > l.unitCost : filter === "down" ? l.marketPrice < l.unitCost : true))
        .filter((l) => name(l.skinId).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => Math.abs((b.marketPrice - b.unitCost) * b.quantity) - Math.abs((a.marketPrice - a.unitCost) * a.quantity)),
    [stock, filter, q, name],
  );

  return (
    <div className="space-y-4">
      <DemoNotice>
        Compara o valor de mercado atual com o preço que você pagou em cada lote. Enquanto nenhuma API de preços estiver conectada, o
        valor de mercado pode ser atualizado manualmente na tabela.
      </DemoNotice>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={`Altas · ${formatInt(v.upUnits)} skins`} value={`+ ${formatBRL(v.gain)}`} icon={TrendingUp} />
        <KpiCard label={`Baixas · ${formatInt(v.downUnits)} skins`} value={`- ${formatBRL(Math.abs(v.loss))}`} icon={TrendingDown} />
        <KpiCard label="Resultado vs. preço pago" value={`${v.result >= 0 ? "+" : "-"} ${formatBRL(Math.abs(v.result))}`} icon={Layers} />
      </div>
      <Panel title="Variação por lote" icon={TrendingUp}>
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex h-10 min-w-[220px] flex-1 items-center rounded-[8px] border border-[#1d1e22] bg-[#0e0f11] px-3">
            <Search size={16} className="text-fg-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar skin..." className="ml-2 flex-1 bg-transparent text-[13.5px] outline-none" />
          </label>
          {([["all", "Todos"], ["up", "Valorizando"], ["down", "Desvalorizando"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={cn("h-10 rounded-[8px] border px-3 text-[12.5px] font-semibold", filter === k ? "border-primary bg-primary/15 text-white" : "border-[#1d1e22] bg-[#0e0f11] text-fg-2")}>
              {label}
            </button>
          ))}
        </div>
        <Table head={["Skin", "Qtd", "Preço pago", "Mercado atual", "Variação", "Resultado"]} minWidth={760}>
          {list.map((l) => {
            const pct = lotVariationPct(l);
            const total = (l.marketPrice - l.unitCost) * l.quantity;
            return (
              <tr key={l.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-12 shrink-0">{map.get(l.skinId) && <Image src={map.get(l.skinId)!.image} alt="" fill sizes="48px" className="object-contain" />}</div>
                    <span className="font-semibold">{name(l.skinId)}</span>
                    <span className="text-[11.5px] text-faint">{l.wear}</span>
                  </div>
                </td>
                <td>{formatInt(l.quantity)}</td>
                <td>{formatBRL(l.unitCost)}</td>
                <td>
                  <input
                    defaultValue={l.marketPrice.toFixed(2)}
                    inputMode="decimal"
                    aria-label="Valor de mercado"
                    onBlur={(e) => {
                      const p = Number(e.target.value.replace(",", "."));
                      if (p > 0 && p !== l.marketPrice) {
                        setPrice(l.id, p);
                        toast("Valor de mercado atualizado");
                      }
                    }}
                    className="h-8 w-[100px] rounded-[6px] border border-[#24252b] bg-[#0e0f12] px-2 text-right text-[12.5px] outline-none focus:border-primary/60"
                  />
                </td>
                <td className={cn("font-semibold", pct >= 0 ? "text-[#3ee07a]" : "text-[#ff5a6e]")}>{pct >= 0 ? "↑ +" : "↓ "}{pct.toFixed(1).replace(".", ",")}%</td>
                <td className={cn("font-semibold", total >= 0 ? "text-[#3ee07a]" : "text-[#ff5a6e]")}>{total >= 0 ? "+" : "-"} {formatBRL(Math.abs(total))}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </div>
  );
}
