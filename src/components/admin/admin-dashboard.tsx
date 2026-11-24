"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  BadgeDollarSign,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Crown,
  Database,
  FileDown,
  Info,
  Layers,
  Link2,
  MessageCircle,
  MoreVertical,
  Package,
  PackagePlus,
  Plug,
  RefreshCw,
  Rocket,
  Scale,
  ShoppingBag,
  Store,
  Tags,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  UserRound,
  UsersRound,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import {
  STOCK_STATUS,
  buildAlerts,
  cashFlow,
  clientSummary,
  dailySeries,
  financialSummary,
  priceVariation,
  recoveryQueue,
  stockSummary,
  subStoreSummary,
  timeAgo,
} from "@/lib/admin-metrics";
import { SUB_STORE_PLANS } from "@/data/demo/admin";
import { useAdminStore } from "@/stores/admin-store";
import { effectiveWhatsApp, useSettingsStore } from "@/stores/settings-store";
import { AreaChart, DonutChart } from "./charts";
import { Badge, KpiCard, OutlineLink, Panel, SelectPill, Toggle, Trend } from "./admin-ui";
import { useAdminData } from "./admin-data-provider";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const dayLabel = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;

function FinancePanel() {
  const movements = useAdminStore((s) => s.movements);
  const [days, setDays] = useState<"7" | "15" | "30">("30");
  const series = useMemo(() => dailySeries(movements, Number(days)), [movements, days]);
  return (
    <Panel
      title="Desempenho Financeiro"
      icon={BarChart3}
      className="xl:col-span-5"
      actions={
        <>
          <span className="mr-1 hidden items-center gap-3 text-[12px] text-fg-2 sm:flex">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#ff1f3d]" />Faturamento</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#22c55e]" />Lucro</span>
          </span>
          <SelectPill
            label="Período"
            value={days}
            onChange={setDays}
            options={[{ id: "7", label: "Últimos 7 dias" }, { id: "15", label: "Últimos 15 dias" }, { id: "30", label: "Últimos 30 dias" }]}
          />
        </>
      }
    >
      <AreaChart
        ariaLabel={`Faturamento e lucro diários dos últimos ${days} dias`}
        labels={series.map((p) => dayLabel(p.date))}
        series={[
          { key: "rev", label: "Faturamento", color: "#ff1f3d", values: series.map((p) => p.revenue) },
          { key: "pro", label: "Lucro", color: "#22c55e", values: series.map((p) => p.profit) },
        ]}
        height={190}
      />
    </Panel>
  );
}

function StockPanel() {
  const stock = useAdminStore((s) => s.stock);
  const sum = useMemo(() => stockSummary(stock), [stock]);
  return (
    <Panel title="Resumo do Estoque" icon={Package} className="xl:col-span-4" actions={<OutlineLink href="/admin/estoque">Gerenciar Estoque</OutlineLink>}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
        <DonutChart
          total={formatInt(sum.units)}
          caption="Skins"
          segments={sum.byStatus.map((b) => ({ label: STOCK_STATUS[b.status].label, value: b.qty, color: STOCK_STATUS[b.status].color }))}
        />
        <ul className="w-full flex-1 space-y-[14px] text-[13.5px]">
          {sum.byStatus.map((b) => (
            <li key={b.status} className="flex items-center gap-2.5">
              <span className="size-[10px] rounded-full" style={{ background: STOCK_STATUS[b.status].color }} />
              <span className="flex-1 text-fg">{STOCK_STATUS[b.status].label}</span>
              <span className="font-semibold">{formatInt(b.qty)}</span>
              <span className="w-[52px] text-right text-fg-2">({b.pct.toFixed(1).replace(".", ",")}%)</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-[#17181c] pt-3 text-[12.5px] text-fg-2">
            Valor de mercado <span className="font-semibold text-fg">{formatBRL(sum.marketValue)}</span>
          </li>
        </ul>
      </div>
    </Panel>
  );
}

function QuickActionsPanel() {
  const movements = useAdminStore((s) => s.movements);
  const goal = useAdminStore((s) => s.monthlyGoal);
  const setGoal = useAdminStore((s) => s.setMonthlyGoal);
  const revenue = useMemo(() => financialSummary(movements, 30).revenue, [movements]);
  const pct = Math.min(100, (revenue / Math.max(goal, 1)) * 100);
  const actions = [
    { label: "Registrar compra de skins", icon: PackagePlus, href: "/admin/estoque?acao=compra" },
    { label: "Registrar venda", icon: ShoppingBag, href: "/admin/estoque" },
    { label: "Criar nova sub-loja", icon: Store, href: "/admin/sub-lojas?acao=nova" },
    { label: "Recuperar clientes inativos", icon: MessageCircle, href: "/admin/automacao" },
    { label: "Ajustar preços", icon: Tags, href: "/admin/precos" },
    { label: "Exportar relatórios", icon: FileDown, href: "/admin/relatorios" },
  ];
  return (
    <Panel
      title="Ações rápidas"
      icon={Zap}
      className="xl:col-span-3 xl:row-span-2"
      actions={<span className="flex items-center gap-1.5 text-[12px] font-semibold text-success"><span className="size-2 rounded-full bg-success" />Online</span>}
      bodyClassName="flex flex-col"
    >
      <ul className="space-y-[9px]">
        {actions.map((a) => (
          <li key={a.label}>
            <Link
              href={a.href}
              className="group flex h-[40px] items-center gap-3 rounded-[10px] border border-[#18191d] bg-[#0d0e11] px-3 text-[13.5px] transition-colors hover:border-primary/50 hover:bg-[#14080b]"
            >
              <a.icon size={17} strokeWidth={1.8} className="text-fg-2 group-hover:text-primary" />
              <span className="flex-1">{a.label}</span>
              <ChevronRight size={15} className="text-faint group-hover:text-fg" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-5">
        <div className="rounded-[12px] border border-[#18191d] bg-[#0d0e11] p-3.5">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-2 font-semibold"><Rocket size={15} className="text-primary" />Meta de faturamento (30 dias)</span>
          </div>
          <p className="mt-2 text-[20px] font-bold tracking-[-0.01em]">{formatBRL(revenue)}</p>
          <div className="mt-2 h-[8px] overflow-hidden rounded-full bg-[#1a1b20]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#b5001b,#ff1238)] shadow-[0_0_10px_rgb(230_0_35/0.6)]" style={{ width: `${pct}%` }} />
          </div>
          <label className="mt-2 flex items-center justify-between gap-2 text-[12px] text-fg-2">
            {pct.toFixed(0)}% de
            <input
              type="number"
              min={0}
              step={1000}
              value={goal}
              onChange={(e) => setGoal(Math.max(0, Number(e.target.value) || 0))}
              aria-label="Meta de faturamento"
              className="h-7 w-[110px] rounded-[6px] border border-[#24252b] bg-[#0a0b0d] px-2 text-right text-[12px] text-fg outline-none focus:border-primary/60"
            />
          </label>
        </div>
      </div>
    </Panel>
  );
}

function CashFlowPanel() {
  const movements = useAdminStore((s) => s.movements);
  const [days, setDays] = useState<"7" | "15" | "30">("7");
  const flow = useMemo(() => cashFlow(movements, Number(days)), [movements, days]);
  return (
    <Panel
      title="Entradas e Saídas"
      icon={ArrowRightLeft}
      className="xl:col-span-3"
      actions={<SelectPill label="Período" value={days} onChange={setDays} options={[{ id: "7", label: "7 dias" }, { id: "15", label: "15 dias" }, { id: "30", label: "30 dias" }]} />}
    >
      <ul className="text-[13.5px]">
        <li className="flex items-center gap-3 border-b border-[#141519] pb-3">
          <ArrowDownToLine size={18} className="text-success" />
          <span className="flex-1">Entradas (compras)</span>
          <span className="font-semibold">{formatBRL(flow.purchases)}</span>
        </li>
        <li className="flex items-center gap-3 border-b border-[#141519] py-3">
          <ArrowUpFromLine size={18} className="text-[#ff3b4f]" />
          <span className="flex-1">Saídas (vendas)</span>
          <span className="font-semibold">{formatBRL(flow.sales)}</span>
        </li>
        <li className="flex items-center gap-3 pt-3.5">
          <Scale size={18} className="text-fg-2" />
          <span className="flex-1 font-semibold">Resultado</span>
          <span className={cn("text-[19px] font-bold", flow.result >= 0 ? "text-[#3ee07a]" : "text-[#ff5a6e]")}>
            {flow.result >= 0 ? "+ " : "- "}
            {formatBRL(Math.abs(flow.result))}
          </span>
        </li>
      </ul>
    </Panel>
  );
}

function VariationPanel() {
  const stock = useAdminStore((s) => s.stock);
  const v = useMemo(() => priceVariation(stock), [stock]);
  return (
    <Panel title={<Link href="/admin/financeiro/variacoes" className="hover:text-white">Baixas e Altas de Skins</Link>} icon={TrendingUp} className="xl:col-span-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[10px] border border-[#14532d]/70 bg-[#0a1f12] p-3">
          <p className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-fg-2"><TrendingUp size={14} className="text-success" />Altas (valorização)</p>
          <p className="mt-1.5 whitespace-nowrap text-[15px] font-bold text-[#3ee07a]">+ {formatBRL(v.gain)}</p>
          <p className="text-[12px] text-[#3ee07a]/90">↑ {formatInt(v.upUnits)} skins</p>
        </div>
        <div className="rounded-[10px] border border-[#5a0c18]/80 bg-[#22070c] p-3">
          <p className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-fg-2"><TrendingDown size={14} className="text-[#ff3b4f]" />Baixas (desvalor.)</p>
          <p className="mt-1.5 whitespace-nowrap text-[15px] font-bold text-[#ff5a6e]">- {formatBRL(Math.abs(v.loss))}</p>
          <p className="text-[12px] text-[#ff5a6e]/90">↓ {formatInt(v.downUnits)} skins</p>
        </div>
      </div>
      <p className="mt-3 rounded-[10px] border border-[#18191d] bg-[#0d0e11] px-3 py-2 text-center text-[13px]">
        Resultado vs. preço pago:{" "}
        <span className={cn("font-bold", v.result >= 0 ? "text-[#3ee07a]" : "text-[#ff5a6e]")}>
          {v.result >= 0 ? "+ " : "- "}
          {formatBRL(Math.abs(v.result))}
        </span>
      </p>
    </Panel>
  );
}

function SubStoresPanel() {
  const subStores = useAdminStore((s) => s.subStores);
  const sum = subStoreSummary(subStores);
  return (
    <Panel
      title="Sub-Lojas"
      icon={Store}
      className="xl:col-span-3"
      actions={
        <Link href="/admin/sub-lojas?acao=nova" className="btn-solid-red inline-flex h-[30px] items-center whitespace-nowrap rounded-[8px] px-3 text-[12.5px] font-semibold">
          Nova Sub-Loja
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[10px] bg-[#0d0e11] p-2">
          <p className="text-[16px] font-bold">{sum.active}</p>
          <p className="text-[10.5px] text-fg-2">ativas</p>
        </div>
        <div className="rounded-[10px] bg-[#0d0e11] p-2">
          <p className="text-[15px] font-bold">{formatBRL(sum.mrr).replace(",00", "")}</p>
          <p className="text-[10.5px] text-fg-2">receita/mês</p>
        </div>
        <div className="rounded-[10px] bg-[#0d0e11] p-2">
          <p className={cn("text-[16px] font-bold", sum.pending ? "text-amber-300" : "")}>{sum.pending}</p>
          <p className="text-[10.5px] text-fg-2">aguardando</p>
        </div>
      </div>
      <ul className="mt-2.5 text-[12.5px]">
        {subStores.slice(0, 3).map((s) => (
          <li key={s.id} className="flex items-center gap-2 border-b border-[#141519] py-2 last:border-0">
            <span className="flex-1 truncate text-fg-2">/loja/{s.slug}</span>
            {s.status === "active" ? <Badge tone="success">Ativa</Badge> : s.status === "pending" ? <Badge tone="warning">Pagamento</Badge> : <Badge tone="danger">Suspensa</Badge>}
            <span className="w-[92px] text-right font-semibold">{formatBRL(SUB_STORE_PLANS[s.plan].price).replace(",00", "")}/mês</span>
            <Link href="/admin/sub-lojas" aria-label={`Gerenciar ${s.name}`} className="text-fg-2 hover:text-fg">
              <MoreVertical size={15} />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ClientsPanel() {
  const clients = useAdminStore((s) => s.clients);
  const sum = useMemo(() => clientSummary(clients), [clients]);
  const rows = [
    { icon: UsersRound, label: "Clientes totais", value: formatInt(sum.total) },
    { icon: UserRound, label: "Clientes ativos (30 dias)", value: formatInt(sum.active) },
    { icon: UserPlus, label: "Novos clientes (30 dias)", value: formatInt(sum.newOnes) },
    { icon: UserMinus, label: "Clientes inativos (+60 dias)", value: formatInt(sum.inactive), danger: true },
  ];
  return (
    <Panel title="Clientes" icon={UsersRound} className="xl:col-span-3" actions={<OutlineLink href="/admin/clientes">Ver todos</OutlineLink>}>
      <ul className="text-[13px]">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 border-b border-[#141519] py-[9px] first:pt-0">
            <r.icon size={17} strokeWidth={1.8} className="text-fg-2" />
            <span className="flex-1">{r.label}</span>
            <span className={cn("font-bold", r.danger && "text-[#ff5a6e]")}>{r.value}</span>
          </li>
        ))}
        {sum.top && (
          <li className="flex items-center gap-3 pt-[10px]">
            <Crown size={17} strokeWidth={1.8} className="text-amber-300" />
            <span className="flex-1">Top cliente <span className="text-fg-2">@{sum.top.handle}</span></span>
            <span className="font-bold">{formatBRL(sum.top.totalSpent)}</span>
          </li>
        )}
      </ul>
    </Panel>
  );
}

function RecoveryPanel() {
  const rules = useAdminStore((s) => s.rules);
  const clients = useAdminStore((s) => s.clients);
  const enabled = useAdminStore((s) => s.recoveryEnabled);
  const setEnabled = useAdminStore((s) => s.setRecoveryEnabled);
  const queue = useMemo(() => recoveryQueue(clients, rules), [clients, rules]);
  return (
    <Panel
      title={
        <span>
          Recuperação de Clientes
          <span className="block text-[12px] font-normal text-fg-2">Automação de reengajamento</span>
        </span>
      }
      icon={RefreshCw}
      className="xl:col-span-3"
      actions={<Toggle checked={enabled} onChange={setEnabled} label="Ativar recuperação automática" />}
      bodyClassName="flex flex-col"
    >
      <ul className="space-y-[7px] text-[13px]">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-2.5">
            <MessageCircle size={17} className="shrink-0 text-success" />
            <span className="flex-1 leading-tight">{r.label}</span>
            {r.enabled && enabled ? <Badge tone="success">Ativo</Badge> : <Badge tone="neutral">Pausado</Badge>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-fg-2">
        <span className="font-semibold text-fg">{queue.length}</span> clientes na fila de recuperação
      </p>
      <Link
        href="/admin/automacao"
        className="mt-auto inline-flex h-[36px] items-center justify-center gap-2 rounded-[8px] border border-primary/70 text-[13px] font-semibold transition-colors hover:bg-primary/10"
        style={{ marginTop: 12 }}
      >
        Configurar Automação
      </Link>
    </Panel>
  );
}

const ALERT_ICON = {
  danger: { icon: AlertTriangle, cls: "text-[#ff3b4f]" },
  info: { icon: Info, cls: "text-sky-400" },
  success: { icon: CheckCircle2, cls: "text-success" },
  warning: { icon: Zap, cls: "text-amber-300" },
};

function AlertsPanel() {
  const { skins } = useAdminData();
  const stock = useAdminStore((s) => s.stock);
  const clients = useAdminStore((s) => s.clients);
  const subStores = useAdminStore((s) => s.subStores);
  const alerts = useMemo(() => buildAlerts({ stock, clients, subStores, skins: new Map(skins.map((s) => [s.id, s])) }), [stock, clients, subStores, skins]);
  return (
    <Panel title="Últimos Alertas" icon={Bell} className="xl:col-span-3" actions={<OutlineLink href="/admin/estoque">Ver estoque</OutlineLink>}>
      <ul className="text-[13px]">
        {alerts.slice(0, 4).map((a) => {
          const I = ALERT_ICON[a.kind];
          return (
            <li key={a.id}>
              <Link href={a.href ?? "/admin"} className="flex items-start gap-2.5 border-b border-[#141519] py-[9px] first:pt-0 hover:text-white">
                <I.icon size={17} className={cn("mt-[1px] shrink-0", I.cls)} />
                <span className="flex-1 leading-snug">{a.message}</span>
                <span className="shrink-0 text-[11.5px] text-faint">{timeAgo(a.date)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function IntegrationsPanel() {
  const whatsapp = useSettingsStore((s) => s.whatsapp);
  const items = [
    { icon: MessageCircle, label: "WhatsApp (link de pedidos)", ok: Boolean(effectiveWhatsApp(whatsapp)), href: "/admin/whatsapp" },
    { icon: Plug, label: "API do WhatsApp (automações)", ok: false, href: "/admin/automacao" },
    { icon: Wallet, label: "Gateway de pagamento", ok: false, href: "/admin/sub-lojas" },
    { icon: Database, label: "Supabase (banco)", ok: false, href: "/admin/configuracoes" },
  ];
  return (
    <Panel title="Integrações" icon={Link2} className="xl:col-span-3" actions={<OutlineLink href="/admin/configuracoes">Gerenciar</OutlineLink>}>
      <ul className="text-[13px]">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="flex items-center gap-3 border-b border-[#141519] py-[9px] first:pt-0 last:border-0">
              <i.icon size={18} strokeWidth={1.8} className={i.ok ? "text-success" : "text-fg-2"} />
              <span className="flex-1">{i.label}</span>
              {i.ok ? <Badge tone="success">Conectado</Badge> : <Badge tone="warning">Pendente</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function AdminDashboard() {
  const movements = useAdminStore((s) => s.movements);
  const fin = useMemo(() => financialSummary(movements, 30), [movements]);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Faturamento (30 dias)" value={formatBRL(fin.revenue)} trend={fin.trend.revenue} icon={Wallet} />
        <KpiCard label="Lucro Líquido" value={formatBRL(fin.profit)} trend={fin.trend.profit} icon={BadgeDollarSign} />
        <KpiCard label="Vendas" value={formatInt(fin.sales)} trend={fin.trend.sales} icon={Package} />
        <KpiCard label="Margem Média" value={`${fin.margin.toFixed(1).replace(".", ",")}%`} trend={fin.trend.margin} icon={Layers} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <FinancePanel />
        <StockPanel />
        <QuickActionsPanel />
        <CashFlowPanel />
        <VariationPanel />
        <SubStoresPanel />
        <ClientsPanel />
        <RecoveryPanel />
        <AlertsPanel />
        <IntegrationsPanel />
      </div>
      <p className="text-center text-[11.5px] text-faint">
        Dados demonstrativos — painel ainda não conectado ao banco. Os indicadores comparam com os 30 dias anteriores.
      </p>
    </div>
  );
}
