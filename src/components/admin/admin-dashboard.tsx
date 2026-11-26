"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Calculator, PackagePlus, Pencil, RefreshCw, Store } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import { skinDisplayName } from "@/lib/skin";
import { STOCK_STATUS, buildAlerts, cashFlow, dailySeries, financialSummary, stockSummary, timeAgo, daysSince } from "@/lib/admin-metrics";
import type { Movement } from "@/types/admin";
import { useAdminStore } from "@/stores/admin-store";
import { AnimatedNumber } from "@/components/upgrade/upgrade-reactor";
import { AreaChart } from "./charts";
import { Trend } from "./admin-ui";
import { useAdminData } from "./admin-data-provider";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DAY = 86_400_000;
const dayLabel = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
const brl = (v: number) => formatBRL(v);
const int = (v: number) => formatInt(Math.round(v));

type Period = "7" | "30" | "90";
type Metric = "revenue" | "profit" | "sales" | "ticket";

const METRICS: { id: Metric; label: string; color: string; format: (v: number) => string }[] = [
  { id: "revenue", label: "Faturamento", color: "#ff2d4b", format: brl },
  { id: "profit", label: "Lucro líquido", color: "#22c55e", format: brl },
  { id: "sales", label: "Skins vendidas", color: "#f5f5f5", format: int },
  { id: "ticket", label: "Ticket médio", color: "#f59e0b", format: brl },
];

/** Série diária de faturamento, lucro, unidades e ticket médio */
function useDaily(movements: Movement[], days: number) {
  return useMemo(() => {
    const base = dailySeries(movements, days);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const first = start.getTime() - (days - 1) * DAY;
    const units = Array.from({ length: days }, () => 0);
    for (const m of movements) {
      if (m.type !== "out") continue;
      const t = new Date(m.date);
      t.setHours(0, 0, 0, 0);
      const i = Math.round((t.getTime() - first) / DAY);
      if (i >= 0 && i < days) units[i]! += m.quantity;
    }
    return base.map((p, i) => ({ ...p, sales: units[i]!, ticket: units[i] ? p.revenue / units[i]! : 0 }));
  }, [movements, days]);
}

/* ---------------------------------------------------------------- peças */

function Card({ children, className, glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return <section className={cn(glow ? "card-premium-red" : "card-premium", "relative overflow-hidden", className)}>{children}</section>;
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="relative flex rounded-full border border-white/[0.08] bg-black/40 p-1">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className="relative h-7 rounded-full px-3 text-[12px] font-semibold">
          {value === o.id && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className={cn("relative", value === o.id ? "text-black" : "text-muted hover:text-white")}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function Spark({ values, color, height = 36 }: { values: number[]; color: string; height?: number }) {
  const id = useId();
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => [(i / Math.max(1, n - 1)) * 100, height - (v / max) * (height - 4) - 2] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join("");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L100,${height}L0,${height}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Ring({ value, size = 120, stroke = 10, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="goal-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff4d67" />
            <stop offset="1" stopColor="#b5001b" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#goal-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 8px rgb(230 0 35 / 0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- blocos */

function Greeting() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const h = now?.getHours() ?? 12;
  const hello = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return (
    <div>
      <p className="text-[12.5px] text-muted">{now ? now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : " "}</p>
      <h2 className="mt-0.5 text-[26px] font-semibold tracking-[-0.02em]">
        {hello}, <span className="text-primary">Equipe BRN</span>
      </h2>
    </div>
  );
}

function QuickActions() {
  const items = [
    { href: "/admin/cotador", label: "Nova cotação", icon: Calculator, primary: true },
    { href: "/admin/estoque?acao=compra", label: "Registrar compra", icon: PackagePlus },
    { href: "/admin/sub-lojas?acao=nova", label: "Sub-loja", icon: Store },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={cn(
            "group inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-all",
            a.primary
              ? "bg-primary text-white shadow-[0_10px_28px_-12px_rgb(230_0_35/0.95)] hover:-translate-y-0.5 hover:bg-primary-hover"
              : "border border-white/[0.1] text-fg-2 hover:-translate-y-0.5 hover:border-white/[0.22] hover:text-white",
          )}
        >
          <a.icon size={15} /> {a.label}
        </Link>
      ))}
    </div>
  );
}

function MetricTile({
  m,
  value,
  trend,
  series,
  active,
  onSelect,
}: {
  m: (typeof METRICS)[number];
  value: number;
  trend: number;
  series: number[];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group relative overflow-hidden rounded-[18px] border p-4 text-left transition-all duration-200",
        active
          ? "border-transparent bg-[linear-gradient(180deg,#160709,#0b0607)] shadow-[0_0_0_1px_rgb(255_45_75/0.55),0_20px_40px_-24px_rgb(230_0_35/0.8)]"
          : "border-white/[0.07] bg-[linear-gradient(180deg,#0d0e11,#090a0c)] hover:-translate-y-0.5 hover:border-white/[0.16]",
      )}
    >
      {active && <span className="absolute right-3 top-3 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-[#ff8a9b]">no gráfico</span>}
      <p className="flex items-center gap-2 text-[12.5px] font-medium text-fg-2">
        <span className="size-2 rounded-full" style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
        {m.label}
      </p>
      <AnimatedNumber value={value} format={m.format} className="mt-2 block text-[25px] font-semibold leading-none tracking-[-0.02em] tabular-nums" />
      <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-faint">
        <Trend value={trend} /> <span>vs. período anterior</span>
      </div>
      <div className="-mx-4 -mb-4 mt-3 opacity-80 transition-opacity group-hover:opacity-100">
        <Spark values={series} color={m.color} />
      </div>
    </button>
  );
}

function GoalCard({ revenue }: { revenue: number }) {
  const goal = useAdminStore((s) => s.monthlyGoal);
  const setGoal = useAdminStore((s) => s.setMonthlyGoal);
  const [editing, setEditing] = useState(false);
  const progress = revenue / Math.max(goal, 1);
  const missing = Math.max(0, goal - revenue);
  return (
    <Card glow className="flex items-center gap-5 p-5">
      <Ring value={progress}>
        <span>
          <span className="block text-[24px] font-semibold leading-none">{Math.round(progress * 100)}%</span>
          <span className="text-[11px] text-muted">da meta</span>
        </span>
      </Ring>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-[#ffb3be]">Meta de faturamento · 30 dias</p>
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
            className="mt-2 h-9 w-[150px] rounded-full border border-white/[0.15] bg-black/40 px-3 text-[14px] font-semibold outline-none focus:border-primary"
          />
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="mt-1 inline-flex items-center gap-1.5 text-[22px] font-semibold tracking-[-0.02em] hover:text-[#ffb3be]">
            {formatBRL(goal).replace(",00", "")} <Pencil size={13} className="text-muted" />
          </button>
        )}
        <p className="mt-1 text-[12px] text-muted">{missing > 0 ? `Faltam ${formatBRL(missing)} para bater` : "Meta batida 🎯"}</p>
      </div>
    </Card>
  );
}

const TONE = { danger: "#ff3b4f", warning: "#f59e0b", info: "#38bdf8", success: "#22c55e" } as const;

function AttentionCard() {
  const { skins } = useAdminData();
  const stock = useAdminStore((s) => s.stock);
  const clients = useAdminStore((s) => s.clients);
  const subStores = useAdminStore((s) => s.subStores);
  const alerts = useMemo(() => buildAlerts({ stock, clients, subStores, skins: new Map(skins.map((s) => [s.id, s])) }).filter((a) => a.kind !== "success"), [stock, clients, subStores, skins]);
  return (
    <Card className="flex flex-1 flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14.5px] font-semibold">Precisa de atenção</h3>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-2 text-[11.5px] font-semibold">{alerts.length}</span>
      </div>
      <ol className="mt-3 space-y-1">
        {alerts.slice(0, 4).map((a, i) => (
          <motion.li key={a.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
            <Link href={a.href ?? "/admin"} className="group flex items-start gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-white/[0.03]">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: TONE[a.kind], boxShadow: `0 0 10px ${TONE[a.kind]}` }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-snug text-fg group-hover:text-white">{a.message}</span>
                <span className="text-[11px] text-faint">{timeAgo(a.date)}</span>
              </span>
              <ArrowUpRight size={13} className="mt-1 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </motion.li>
        ))}
        {!alerts.length && <li className="py-6 text-center text-[13px] text-muted">Nada pendente agora.</li>}
      </ol>
    </Card>
  );
}

interface Ticker {
  configured: boolean;
  usdBrl: number;
  cnyBrl: number;
  mode: string;
  cnyRate: number | null;
  marginPct: number;
  source: string;
  syncedAt: string | null;
  items: number;
}

function MarketCard() {
  const [t, setT] = useState<Ticker | null>(null);
  useEffect(() => {
    fetch("/api/admin/market-ticker")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.configured && setT(d))
      .catch(() => {});
  }, []);
  const source = t ? ({ buff163: "BUFF163", c5game: "C5Game", csfloat: "CSFloat", skinport: "Skinport", steam: "Steam" } as Record<string, string>)[t.source] ?? t.source : "—";
  return (
    <Card className="flex flex-col p-5 xl:col-span-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14.5px] font-semibold">Mercado hoje</h3>
        <Link href="/admin/mercado" aria-label="Abrir preços de mercado" className="grid size-7 place-items-center rounded-full border border-white/[0.08] text-muted hover:border-white/[0.2] hover:text-white">
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[14px] border border-white/[0.06] bg-black/25 p-3">
          <p className="text-[11px] text-muted">¥ 1 (yuan)</p>
          <p className="mt-1 text-[20px] font-semibold tabular-nums">{t ? `R$ ${t.cnyBrl.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : "—"}</p>
        </div>
        <div className="rounded-[14px] border border-white/[0.06] bg-black/25 p-3">
          <p className="text-[11px] text-muted">US$ 1 (dólar)</p>
          <p className="mt-1 text-[20px] font-semibold tabular-nums">{t ? `R$ ${t.usdBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-[12.5px]">
        <div className="flex justify-between">
          <dt className="text-muted">Preço da loja</dt>
          <dd className="font-medium">{t ? `${source} · ${t.mode === "cny" && t.cnyRate ? `¥ × ${t.cnyRate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}` : `dólar +${t.marginPct}%`}` : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Itens no catálogo</dt>
          <dd className="font-medium tabular-nums">{t ? formatInt(t.items) : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Última sincronização</dt>
          <dd className="font-medium">{t?.syncedAt ? timeAgo(t.syncedAt) : "—"}</dd>
        </div>
      </dl>
      <Link
        href="/admin/cotador"
        className="mt-auto flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.1] text-[13px] font-medium text-fg-2 transition-colors hover:border-white/[0.22] hover:text-white"
        style={{ marginTop: 16 }}
      >
        <Calculator size={14} /> Abrir cotador
      </Link>
    </Card>
  );
}

function StockCard() {
  const { skins } = useAdminData();
  const stock = useAdminStore((s) => s.stock);
  const sum = useMemo(() => stockSummary(stock), [stock]);
  const top = useMemo(() => {
    const map = new Map(skins.map((s) => [s.id, s]));
    const seen = new Set<string>();
    return [...stock]
      .sort((a, b) => b.marketPrice * b.quantity - a.marketPrice * a.quantity)
      .flatMap((l) => {
        const s = map.get(l.skinId);
        if (!s || seen.has(s.id)) return [];
        seen.add(s.id);
        return [{ lot: l, skin: s }];
      })
      .slice(0, 4);
  }, [stock, skins]);
  return (
    <Card className="flex flex-col p-5 xl:col-span-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14.5px] font-semibold">Estoque</h3>
        <Link href="/admin/estoque" aria-label="Abrir estoque" className="grid size-7 place-items-center rounded-full border border-white/[0.08] text-muted hover:border-white/[0.2] hover:text-white">
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
        <AnimatedNumber value={sum.marketValue} format={brl} />
        <span className="ml-2 text-[12px] font-normal text-muted">{formatInt(sum.units)} skins</span>
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {top.map(({ lot, skin }) => (
          <div key={lot.id} className="group relative rounded-[12px] border border-white/[0.06] bg-[radial-gradient(circle_at_50%_35%,#1b1c21,#0a0b0d_75%)] p-1.5" title={`${skinDisplayName(skin)} · ${formatBRL(lot.marketPrice)}`}>
            <div className="relative h-[44px] transition-transform duration-300 group-hover:scale-110">
              <Image src={skin.image} alt="" fill sizes="90px" className="object-contain" />
            </div>
            <p className="mt-1 truncate text-center text-[10.5px] font-semibold tabular-nums">{formatBRL(lot.marketPrice).replace(/,\d\d$/, "")}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <div className="flex h-2 gap-[3px] overflow-hidden rounded-full">
          {sum.byStatus.map((b) => (
            <motion.span key={b.status} initial={{ width: 0 }} animate={{ width: `${b.pct}%` }} transition={{ duration: 0.8 }} className="rounded-full" style={{ background: STOCK_STATUS[b.status].color }} />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
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

const AVATAR = ["#3b0a12", "#0f2a1a", "#10223a", "#2d1a05", "#241336"];

function TopClientsCard() {
  const clients = useAdminStore((s) => s.clients);
  const movements = useAdminStore((s) => s.movements);
  const [days, setDays] = useState<"7" | "30">("7");
  const flow = useMemo(() => cashFlow(movements, Number(days)), [movements, days]);
  const top = useMemo(() => [...clients].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 4), [clients]);
  const max = Math.max(1, ...top.map((c) => c.totalSpent));
  return (
    <Card className="flex flex-col p-5 xl:col-span-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14.5px] font-semibold">Top clientes</h3>
        <Link href="/admin/clientes" aria-label="Abrir clientes" className="grid size-7 place-items-center rounded-full border border-white/[0.08] text-muted hover:border-white/[0.2] hover:text-white">
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <ul className="mt-3 space-y-2.5">
        {top.map((c, i) => (
          <li key={c.id} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1 ring-white/[0.08]" style={{ background: AVATAR[i % AVATAR.length] }}>
              {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className="truncate font-medium">{c.name}</span>
                <span className="shrink-0 tabular-nums text-fg-2">{formatBRL(c.totalSpent).replace(/,\d\d$/, "")}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(c.totalSpent / max) * 100}%` }} transition={{ duration: 0.8, delay: 0.08 * i }} className="h-full rounded-full" style={{ background: i === 0 ? "#ff2d4b" : "rgb(255 255 255 / 0.35)" }} />
              </div>
              <span className="text-[10.5px] text-faint">última compra há {daysSince(c.lastPurchaseAt)} dias</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3" style={{ marginTop: 16 }}>
        <span className="text-[12px] text-muted">
          Caixa <span className={cn("font-semibold", flow.result >= 0 ? "text-[#4ade80]" : "text-[#ff6b7d]")}>{flow.result >= 0 ? "+" : "−"} {formatBRL(Math.abs(flow.result))}</span>
        </span>
        <Seg label="caixa" value={days} onChange={setDays} options={[{ id: "7", label: "7d" }, { id: "30", label: "30d" }]} />
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- página */

export function AdminDashboard() {
  const movements = useAdminStore((s) => s.movements);
  const [period, setPeriod] = useState<Period>("30");
  const [metric, setMetric] = useState<Metric>("revenue");
  const days = Number(period);
  const fin = useMemo(() => financialSummary(movements, days), [movements, days]);
  const prev = useMemo(() => financialSummary(movements.filter((m) => new Date(m.date).getTime() <= Date.now() - days * DAY), days), [movements, days]);
  const series = useDaily(movements, days);
  const ticket = fin.sales ? fin.revenue / fin.sales : 0;
  const prevTicket = prev.sales ? prev.revenue / prev.sales : 0;
  const values: Record<Metric, { value: number; trend: number; series: number[] }> = {
    revenue: { value: fin.revenue, trend: fin.trend.revenue, series: series.map((p) => p.revenue) },
    profit: { value: fin.profit, trend: fin.trend.profit, series: series.map((p) => p.profit) },
    sales: { value: fin.sales, trend: fin.trend.sales, series: series.map((p) => p.sales) },
    ticket: { value: ticket, trend: prevTicket ? Math.round(((ticket - prevTicket) / prevTicket) * 1000) / 10 : 0, series: series.map((p) => p.ticket) },
  };
  const active = METRICS.find((m) => m.id === metric)!;
  const goalFin = useMemo(() => financialSummary(movements, 30), [movements]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Greeting />
        <div className="flex flex-wrap items-center gap-3">
          <QuickActions />
          <Seg label="periodo" value={period} onChange={setPeriod} options={[{ id: "7", label: "7 dias" }, { id: "30", label: "30 dias" }, { id: "90", label: "90 dias" }]} />
        </div>
      </div>

      {/* Indicadores: clique para ver no gráfico */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m) => (
          <MetricTile key={m.id} m={m} {...values[m.id]} active={metric === m.id} onSelect={() => setMetric(m.id)} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-8">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[12.5px] text-muted">
                <span className="size-2 rounded-full" style={{ background: active.color }} /> {active.label} · últimos {days} dias
              </p>
              <AnimatedNumber value={values[metric].value} format={active.format} className="mt-1 block text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id)}
                  className={cn("h-7 rounded-full border px-3 text-[11.5px] font-medium transition-colors", metric === m.id ? "border-white bg-white text-black" : "border-white/[0.1] text-muted hover:text-white")}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <motion.div key={`${metric}-${period}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <AreaChart
              ariaLabel={`${active.label} por dia nos últimos ${days} dias`}
              labels={series.map((p) => dayLabel(p.date))}
              series={[{ key: metric, label: active.label, color: active.color, values: values[metric].series }]}
              height={372}
              money={metric !== "sales"}
            />
          </motion.div>
        </Card>

        <div className="flex flex-col gap-4 xl:col-span-4">
          <GoalCard revenue={goalFin.revenue} />
          <AttentionCard />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <MarketCard />
        <StockCard />
        <TopClientsCard />
      </div>

      <p className="flex items-center gap-1.5 text-[11.5px] text-faint">
        <RefreshCw size={12} /> Vendas, estoque e clientes ainda são dados de demonstração. Câmbio e preços de mercado são reais.
      </p>
    </div>
  );
}
