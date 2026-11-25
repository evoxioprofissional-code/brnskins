"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import { skinDisplayName } from "@/lib/skin";
import {
  STOCK_STATUS,
  buildAlerts,
  cashFlow,
  clientSummary,
  dailySeries,
  daysSince,
  financialSummary,
  recoveryQueue,
  stockSummary,
  timeAgo,
} from "@/lib/admin-metrics";
import type { Movement } from "@/types/admin";
import { useAdminStore } from "@/stores/admin-store";
import { AreaChart } from "./charts";
import { Trend } from "./admin-ui";
import { useAdminData } from "./admin-data-provider";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const dayLabel = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;
const DAY = 86_400_000;

type Period = "7" | "15" | "30";

/** Unidades vendidas por dia (últimos N dias). */
function dailyUnits(movements: Movement[], days: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const first = start.getTime() - (days - 1) * DAY;
  const out = Array.from({ length: days }, () => 0);
  for (const m of movements) {
    if (m.type !== "out") continue;
    const t = new Date(m.date);
    t.setHours(0, 0, 0, 0);
    const i = Math.round((t.getTime() - first) / DAY);
    if (i >= 0 && i < days) out[i]! += m.quantity;
  }
  return out;
}

/* ------------------------------------------------------------------ peças */

function Card({ children, className, variant = "default" }: { children: ReactNode; className?: string; variant?: "default" | "red" }) {
  return <section className={cn(variant === "red" ? "card-premium-red" : "card-premium", "overflow-hidden", className)}>{children}</section>;
}

function Eyebrow({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-medium text-fg-2">{children}</h2>
      {action}
    </div>
  );
}

function CornerLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-7 place-items-center rounded-full border border-white/[0.08] text-muted transition-colors hover:border-white/[0.2] hover:text-white"
    >
      <ArrowUpRight size={14} />
    </Link>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-white/[0.06] bg-black/30 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-6 rounded-full px-2.5 text-[11.5px] font-medium transition-colors",
            value === o.id ? "bg-white text-black" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Área suave que encosta nas bordas do card. */
function Spark({ values, color, height = 64 }: { values: number[]; color: string; height?: number }) {
  const id = useId();
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => [(i / Math.max(1, n - 1)) * 100, height - (v / max) * (height - 6) - 2] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join("");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L100,${height}L0,${height}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Anel de progresso. */
function Ring({ value, size = 92, stroke = 8, color = "#e60023", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ cards */

function RevenueHero() {
  const movements = useAdminStore((s) => s.movements);
  const goal = useAdminStore((s) => s.monthlyGoal);
  const setGoal = useAdminStore((s) => s.setMonthlyGoal);
  const [editing, setEditing] = useState(false);
  const fin = useMemo(() => financialSummary(movements, 30), [movements]);
  const series = useMemo(() => dailySeries(movements, 30).map((p) => p.revenue), [movements]);
  const progress = fin.revenue / Math.max(goal, 1);

  return (
    <Card variant="red" className="flex flex-col sm:col-span-2 xl:col-span-6 xl:row-span-2">
      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#ffb3be]">Faturamento · 30 dias</p>
          <p className="mt-2 whitespace-nowrap text-[28px] font-semibold leading-none tracking-[-0.03em] sm:text-[44px]">{formatBRL(fin.revenue)}</p>
          <div className="mt-3 flex items-center gap-2 text-[12.5px] text-muted">
            <Trend value={fin.trend.revenue} />
            <span>vs. 30 dias anteriores</span>
          </div>
        </div>
        <Ring value={progress} size={96} color="#ff2d4b">
          <span>
            <span className="block text-[18px] font-semibold leading-none">{Math.round(progress * 100)}%</span>
            <span className="text-[10.5px] text-muted">da meta</span>
          </span>
        </Ring>
      </div>

      <div className="flex items-center gap-1.5 px-6 pt-3 text-[12px] text-muted">
        {editing ? (
          <input
            autoFocus
            type="number"
            min={0}
            step={1000}
            defaultValue={goal}
            aria-label="Meta de faturamento"
            onBlur={(e) => {
              setGoal(Math.max(0, Number(e.target.value) || 0));
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="h-7 w-[120px] rounded-full border border-white/[0.12] bg-black/30 px-3 text-[12px] text-fg outline-none focus:border-primary/60"
          />
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 hover:text-fg">
            Meta mensal {formatBRL(goal).replace(",00", "")} <Pencil size={11} />
          </button>
        )}
      </div>

      <div className="mt-auto pt-6">
        <Spark values={series} color="#ff2d4b" height={120} />
      </div>
    </Card>
  );
}

function ProfitCard() {
  const movements = useAdminStore((s) => s.movements);
  const fin = useMemo(() => financialSummary(movements, 30), [movements]);
  const series = useMemo(() => dailySeries(movements, 30).map((p) => p.profit), [movements]);
  return (
    <Card className="flex flex-col xl:col-span-3">
      <div className="p-5 pb-2">
        <Eyebrow>Lucro líquido</Eyebrow>
        <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">{formatBRL(fin.profit)}</p>
        <Trend value={fin.trend.profit} />
      </div>
      <div className="mt-auto">
        <Spark values={series} color="#22c55e" height={56} />
      </div>
    </Card>
  );
}

function SalesCard() {
  const movements = useAdminStore((s) => s.movements);
  const fin = useMemo(() => financialSummary(movements, 30), [movements]);
  const bars = useMemo(() => dailyUnits(movements, 14), [movements]);
  const max = Math.max(1, ...bars);
  return (
    <Card className="flex flex-col p-5 xl:col-span-3">
      <Eyebrow>Skins vendidas</Eyebrow>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-[24px] font-semibold tracking-[-0.02em]">{formatInt(fin.sales)}</p>
        <Trend value={fin.trend.sales} />
      </div>
      <div className="mt-auto flex h-[52px] items-end gap-[3px] pt-3" aria-label="Vendas por dia, últimos 14 dias">
        {bars.map((v, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-t-[3px]", i === bars.length - 1 ? "bg-white" : "bg-white/[0.14]")}
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
            title={`${v} vendidas`}
          />
        ))}
      </div>
    </Card>
  );
}

function MarginCard() {
  const movements = useAdminStore((s) => s.movements);
  const fin = useMemo(() => financialSummary(movements, 30), [movements]);
  return (
    <Card className="flex items-center gap-4 p-5 xl:col-span-3">
      <Ring value={fin.margin / 100} size={84} stroke={7} color="#f5f5f5">
        <span className="text-[16px] font-semibold">{pct(fin.margin)}</span>
      </Ring>
      <div className="min-w-0">
        <Eyebrow>Margem média</Eyebrow>
        <p className="mt-1 text-[12px] leading-snug text-muted">Quanto sobra de cada venda depois do custo.</p>
        <div className="mt-1.5 flex items-center gap-1 text-[12px]">
          <Trend value={fin.trend.margin} suffix=" p.p." />
        </div>
      </div>
    </Card>
  );
}

function TicketCard() {
  const movements = useAdminStore((s) => s.movements);
  const fin = useMemo(() => financialSummary(movements, 30), [movements]);
  const ticket = fin.sales ? fin.revenue / fin.sales : 0;
  return (
    <Card className="relative flex flex-col justify-between p-5 xl:col-span-3">
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full border border-white/[0.05]" />
      <span aria-hidden className="pointer-events-none absolute -right-1 -top-1 size-16 rounded-full border border-white/[0.06]" />
      <Eyebrow>Ticket médio</Eyebrow>
      <div>
        <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">{formatBRL(ticket)}</p>
        <p className="text-[12px] text-muted">por skin vendida</p>
      </div>
    </Card>
  );
}

function RevenueChart() {
  const movements = useAdminStore((s) => s.movements);
  const [days, setDays] = useState<Period>("30");
  const series = useMemo(() => dailySeries(movements, Number(days)), [movements, days]);
  return (
    <Card className="p-5 xl:col-span-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Desempenho</h2>
          <p className="mt-0.5 flex items-center gap-3 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#ff1f3d]" />Faturamento</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#22c55e]" />Lucro</span>
          </p>
        </div>
        <Segmented
          label="Período"
          value={days}
          onChange={setDays}
          options={[{ id: "7", label: "7 dias" }, { id: "15", label: "15 dias" }, { id: "30", label: "30 dias" }]}
        />
      </div>
      <AreaChart
        ariaLabel={`Faturamento e lucro diários dos últimos ${days} dias`}
        labels={series.map((p) => dayLabel(p.date))}
        series={[
          { key: "rev", label: "Faturamento", color: "#ff1f3d", values: series.map((p) => p.revenue) },
          { key: "pro", label: "Lucro", color: "#22c55e", values: series.map((p) => p.profit) },
        ]}
        height={250}
      />
    </Card>
  );
}

const TONE = { danger: "#ff3b4f", warning: "#f59e0b", info: "#38bdf8", success: "#22c55e" } as const;

function AttentionCard() {
  const { skins } = useAdminData();
  const stock = useAdminStore((s) => s.stock);
  const clients = useAdminStore((s) => s.clients);
  const subStores = useAdminStore((s) => s.subStores);
  const alerts = useMemo(
    () => buildAlerts({ stock, clients, subStores, skins: new Map(skins.map((s) => [s.id, s])) }).filter((a) => a.kind !== "success"),
    [stock, clients, subStores, skins],
  );
  return (
    <Card className="flex flex-col p-5 xl:col-span-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Precisa de atenção</h2>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-2 text-[11.5px] font-semibold">{alerts.length}</span>
      </div>
      <ol className="relative mt-4 flex-1 space-y-1 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-white/[0.07]">
        {alerts.slice(0, 5).map((a) => (
          <li key={a.id} className="relative">
            <Link href={a.href ?? "/admin"} className="group flex gap-3.5 rounded-[10px] py-2 pr-2 transition-colors hover:bg-white/[0.025]">
              <span
                className="relative z-10 mt-[5px] size-[11px] shrink-0 rounded-full border-2 border-[#0c0d10]"
                style={{ background: TONE[a.kind], boxShadow: `0 0 10px ${TONE[a.kind]}88` }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-snug text-fg group-hover:text-white">{a.message}</span>
                <span className="text-[11.5px] text-faint">{timeAgo(a.date)}</span>
              </span>
            </Link>
          </li>
        ))}
        {!alerts.length && <li className="py-8 text-center text-[13px] text-muted">Nada pendente agora.</li>}
      </ol>
    </Card>
  );
}

function StockShowcase() {
  const { skins } = useAdminData();
  const stock = useAdminStore((s) => s.stock);
  const sum = useMemo(() => stockSummary(stock), [stock]);
  const top = useMemo(() => {
    const map = new Map(skins.map((s) => [s.id, s]));
    return [...stock]
      .sort((a, b) => b.marketPrice * b.quantity - a.marketPrice * a.quantity)
      .flatMap((l) => {
        const skin = map.get(l.skinId);
        return skin ? [{ lot: l, skin }] : [];
      })
      .filter((v, i, arr) => arr.findIndex((x) => x.skin.id === v.skin.id) === i)
      .slice(0, 3);
  }, [stock, skins]);

  return (
    <Card className="flex flex-col xl:col-span-5">
      <div className="p-5 pb-0">
        <Eyebrow action={<CornerLink href="/admin/estoque" label="Abrir estoque" />}>Estoque</Eyebrow>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
          <p className="text-[24px] font-semibold tracking-[-0.02em]">{formatBRL(sum.marketValue)}</p>
          <p className="text-[12.5px] text-muted">{formatInt(sum.units)} skins em estoque</p>
        </div>
      </div>

      <div className="relative mx-5 mt-4 grid grid-cols-3 gap-2">
        {top.map(({ lot, skin }, i) => (
          <div
            key={lot.id}
            className={cn(
              "relative overflow-hidden rounded-[12px] border border-white/[0.06] bg-[radial-gradient(circle_at_50%_30%,#1a1b20,#0a0b0d_75%)] p-2",
              i === 0 && "border-white/[0.12]",
            )}
          >
            <div className="relative h-[60px]">
              <Image src={skin.image} alt="" fill sizes="160px" className="object-contain drop-shadow-[0_8px_10px_rgb(0_0_0/0.7)]" />
            </div>
            <p className="mt-1.5 truncate text-[11px] text-muted">{skinDisplayName(skin)}</p>
            <p className="text-[12.5px] font-semibold">{formatBRL(lot.marketPrice).replace(/,\d\d$/, "")}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto p-5 pt-4">
        <div className="flex h-2 gap-[3px] overflow-hidden rounded-full" aria-hidden>
          {sum.byStatus.map((b) => (
            <span key={b.status} className="rounded-full" style={{ width: `${b.pct}%`, background: STOCK_STATUS[b.status].color }} />
          ))}
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
          {sum.byStatus.map((b) => (
            <li key={b.status} className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: STOCK_STATUS[b.status].color }} />
              {STOCK_STATUS[b.status].label} <span className="text-fg">{formatInt(b.qty)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function CashCard() {
  const movements = useAdminStore((s) => s.movements);
  const [days, setDays] = useState<Period>("7");
  const flow = useMemo(() => cashFlow(movements, Number(days)), [movements, days]);
  const total = Math.max(1, flow.sales + flow.purchases);
  return (
    <Card className="flex flex-col p-5 xl:col-span-4">
      <Eyebrow
        action={<Segmented label="Período do caixa" value={days} onChange={setDays} options={[{ id: "7", label: "7d" }, { id: "15", label: "15d" }, { id: "30", label: "30d" }]} />}
      >
        Caixa
      </Eyebrow>
      <p className={cn("mt-2 text-[24px] font-semibold tracking-[-0.02em]", flow.result >= 0 ? "text-[#4ade80]" : "text-[#ff6b7d]")}>
        {flow.result >= 0 ? "+" : "−"} {formatBRL(Math.abs(flow.result))}
      </p>
      <p className="text-[12px] text-muted">resultado do período</p>

      <div className="mt-auto space-y-3 pt-5">
        {[
          { label: "Entrou (vendas)", value: flow.sales, color: "#22c55e" },
          { label: "Saiu (compras)", value: flow.purchases, color: "#ff3b4f" },
        ].map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-[12.5px]">
              <span className="text-muted">{r.label}</span>
              <span className="font-medium tabular-nums">{formatBRL(r.value)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full" style={{ width: `${(r.value / total) * 100}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const AVATAR_BG = ["#3b0a12", "#0f2a1a", "#10223a", "#2d1a05", "#241336"];

function ClientsCard() {
  const clients = useAdminStore((s) => s.clients);
  const rules = useAdminStore((s) => s.rules);
  const sum = useMemo(() => clientSummary(clients), [clients]);
  const queue = useMemo(() => recoveryQueue(clients, rules), [clients, rules]);
  const recent = useMemo(
    () => [...clients].sort((a, b) => daysSince(a.lastPurchaseAt) - daysSince(b.lastPurchaseAt)).slice(0, 5),
    [clients],
  );
  return (
    <Card className="flex flex-col p-5 xl:col-span-3">
      <Eyebrow action={<CornerLink href="/admin/clientes" label="Abrir clientes" />}>Clientes</Eyebrow>
      <div className="mt-3 flex -space-x-2">
        {recent.map((c, i) => (
          <span
            key={c.id}
            title={c.name}
            className="grid size-9 place-items-center rounded-full border-2 border-[#0c0d10] text-[11px] font-semibold text-white/90"
            style={{ background: AVATAR_BG[i % AVATAR_BG.length] }}
          >
            {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
        ))}
        {sum.total > recent.length && (
          <span className="grid size-9 place-items-center rounded-full border-2 border-[#0c0d10] bg-white/[0.08] text-[11px] font-medium text-muted">
            +{sum.total - recent.length}
          </span>
        )}
      </div>
      <p className="mt-3 text-[24px] font-semibold tracking-[-0.02em]">
        {formatInt(sum.active)}
        <span className="ml-1.5 text-[13px] font-normal text-muted">ativos de {formatInt(sum.total)}</span>
      </p>
      <p className="mt-1 text-[12px] text-muted">
        <span className="text-fg">{formatInt(sum.newOnes)}</span> novos ·{" "}
        <span className={sum.inactive ? "text-[#ff6b7d]" : "text-fg"}>{formatInt(sum.inactive)}</span> inativos há +60 dias
      </p>
      <Link
        href="/admin/automacao"
        className="mt-auto flex items-center justify-between rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12.5px] transition-colors hover:border-white/[0.14]"
        style={{ marginTop: "auto" }}
      >
        <span className="text-muted">
          <span className="font-medium text-fg">{formatInt(queue.length)}</span> para recuperar
        </span>
        <ArrowUpRight size={14} className="text-muted" />
      </Link>
    </Card>
  );
}

/* ------------------------------------------------------------------ página */

export function AdminDashboard() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Últimos 30 dias, comparados aos 30 anteriores.</p>
        <div className="flex gap-2">
          <Link
            href="/admin/sub-lojas?acao=nova"
            className="inline-flex h-9 items-center rounded-full border border-white/[0.1] px-4 text-[13px] font-medium text-fg-2 transition-colors hover:border-white/[0.2] hover:text-white"
          >
            Nova sub-loja
          </Link>
          <Link
            href="/admin/estoque?acao=compra"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_rgb(230_0_35/0.9)] transition-colors hover:bg-primary-hover"
          >
            <Plus size={15} /> Registrar compra
          </Link>
        </div>
      </div>

      {/* Bento: destaque + 4 indicadores com formatos diferentes */}
      <div className="grid gap-4 sm:grid-cols-2 xl:auto-rows-[minmax(150px,auto)] xl:grid-cols-12">
        <RevenueHero />
        <ProfitCard />
        <SalesCard />
        <MarginCard />
        <TicketCard />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <RevenueChart />
        <AttentionCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <StockShowcase />
        <CashCard />
        <ClientsCard />
      </div>
    </div>
  );
}
