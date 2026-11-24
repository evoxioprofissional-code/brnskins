import type { Skin } from "@/types/catalog";
import type { AdminAlert, Client, Movement, RecoveryRule, StockLot, StockStatus, SubStore } from "@/types/admin";
import { SUB_STORE_PLANS } from "@/data/demo/admin";

const DAY = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const daysSince = (iso: string, now = Date.now()) => Math.floor((now - new Date(iso).getTime()) / DAY);

export const pctChange = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0;

const inRange = (iso: string, fromDaysAgo: number, toDaysAgo: number, now: number) => {
  const t = new Date(iso).getTime();
  return t > now - fromDaysAgo * DAY && t <= now - toDaysAgo * DAY;
};

/** KPIs financeiros de uma janela de N dias comparada à janela anterior. */
export function financialSummary(movements: Movement[], days = 30, now = Date.now()) {
  const calc = (from: number, to: number) => {
    const sales = movements.filter((m) => m.type === "out" && inRange(m.date, from, to, now));
    const revenue = sales.reduce((s, m) => s + m.amount, 0);
    const cost = sales.reduce((s, m) => s + (m.cost ?? 0), 0);
    const profit = revenue - cost;
    return { revenue: round2(revenue), profit: round2(profit), sales: sales.reduce((s, m) => s + m.quantity, 0), margin: revenue ? (profit / revenue) * 100 : 0 };
  };
  const current = calc(days, 0);
  const previous = calc(days * 2, days);
  return {
    ...current,
    trend: {
      revenue: pctChange(current.revenue, previous.revenue),
      profit: pctChange(current.profit, previous.profit),
      sales: pctChange(current.sales, previous.sales),
      margin: Math.round((current.margin - previous.margin) * 10) / 10,
    },
  };
}

/** Série diária de faturamento e lucro. */
export function dailySeries(movements: Movement[], days = 30, now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const points = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() - (days - 1 - i) * DAY);
    return { date: d, revenue: 0, profit: 0 };
  });
  for (const m of movements) {
    if (m.type !== "out") continue;
    const t = new Date(m.date);
    t.setHours(0, 0, 0, 0);
    const idx = Math.round((t.getTime() - points[0]!.date.getTime()) / DAY);
    if (idx < 0 || idx >= days) continue;
    points[idx]!.revenue += m.amount;
    points[idx]!.profit += m.amount - (m.cost ?? 0);
  }
  return points.map((p) => ({ ...p, revenue: round2(p.revenue), profit: round2(p.profit) }));
}

export function cashFlow(movements: Movement[], days: number, now = Date.now()) {
  const list = movements.filter((m) => inRange(m.date, days, 0, now));
  const inflow = list.filter((m) => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const outflow = list.filter((m) => m.type === "out").reduce((s, m) => s + m.amount, 0);
  return { purchases: round2(inflow), sales: round2(outflow), result: round2(outflow - inflow), count: list.length };
}

export const STOCK_STATUS: Record<StockStatus, { label: string; color: string }> = {
  selling: { label: "Em venda", color: "#22c55e" },
  reserved: { label: "Reservadas", color: "#f59e0b" },
  negotiating: { label: "Em negociação", color: "#ff1f3d" },
  other: { label: "Outros", color: "#8b8f9c" },
};

export function stockSummary(stock: StockLot[]) {
  const units = stock.reduce((s, l) => s + l.quantity, 0);
  const byStatus = (Object.keys(STOCK_STATUS) as StockStatus[]).map((status) => {
    const qty = stock.filter((l) => l.status === status).reduce((s, l) => s + l.quantity, 0);
    return { status, qty, pct: units ? (qty / units) * 100 : 0 };
  });
  const costValue = stock.reduce((s, l) => s + l.unitCost * l.quantity, 0);
  const marketValue = stock.reduce((s, l) => s + l.marketPrice * l.quantity, 0);
  return { units, byStatus, costValue: round2(costValue), marketValue: round2(marketValue) };
}

/** Valorização / desvalorização do estoque em relação ao preço pago. */
export function priceVariation(stock: StockLot[]) {
  const up = stock.filter((l) => l.marketPrice > l.unitCost);
  const down = stock.filter((l) => l.marketPrice < l.unitCost);
  const sum = (list: StockLot[]) => round2(list.reduce((s, l) => s + (l.marketPrice - l.unitCost) * l.quantity, 0));
  const units = (list: StockLot[]) => list.reduce((s, l) => s + l.quantity, 0);
  const gain = sum(up);
  const loss = sum(down);
  return { gain, loss, result: round2(gain + loss), upUnits: units(up), downUnits: units(down), upLots: up.length, downLots: down.length };
}

export const lotVariationPct = (l: StockLot) => (l.unitCost ? ((l.marketPrice - l.unitCost) / l.unitCost) * 100 : 0);

export type ClientStatus = "active" | "risk" | "inactive";
export const clientStatus = (c: Client, now = Date.now()): ClientStatus => {
  const d = daysSince(c.lastPurchaseAt, now);
  return d <= 30 ? "active" : d <= 60 ? "risk" : "inactive";
};

export function clientSummary(clients: Client[], now = Date.now()) {
  const active = clients.filter((c) => daysSince(c.lastPurchaseAt, now) <= 30);
  const newOnes = clients.filter((c) => daysSince(c.createdAt, now) <= 30);
  const inactive = clients.filter((c) => daysSince(c.lastPurchaseAt, now) > 60);
  const top = [...clients].sort((a, b) => b.totalSpent - a.totalSpent)[0];
  return { total: clients.length, active: active.length, newOnes: newOnes.length, inactive: inactive.length, top };
}

/** Clientes que se enquadram em alguma regra de recuperação e ainda não foram contatados nela. */
export function recoveryQueue(clients: Client[], rules: RecoveryRule[], now = Date.now()) {
  const enabled = [...rules].filter((r) => r.enabled).sort((a, b) => b.days - a.days);
  return clients
    .map((c) => {
      const idle = daysSince(c.lastPurchaseAt, now);
      const rule = enabled.find((r) => idle >= r.days);
      if (!rule) return null;
      const contactedAfterRule =
        c.lastContactAt && new Date(c.lastContactAt).getTime() >= new Date(c.lastPurchaseAt).getTime() + rule.days * DAY;
      if (contactedAfterRule) return null;
      return { client: c, rule, idle };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => b.client.totalSpent - a.client.totalSpent);
}

export const fillTemplate = (template: string, client: Client) =>
  template.replace(/\{nome\}/g, client.name.split(" ")[0] ?? client.name);

export function subStoreSummary(subStores: SubStore[]) {
  const active = subStores.filter((s) => s.status === "active");
  const mrr = active.reduce((s, x) => s + SUB_STORE_PLANS[x.plan].price, 0);
  return { active: active.length, pending: subStores.filter((s) => s.status === "pending").length, mrr };
}

/** Alertas gerados por regras simples sobre os dados (sem IA). */
export function buildAlerts(params: {
  stock: StockLot[];
  clients: Client[];
  subStores: SubStore[];
  skins: Map<string, Skin>;
  now?: number;
}): AdminAlert[] {
  const now = params.now ?? Date.now();
  const alerts: AdminAlert[] = [];
  const name = (id: string) => {
    const s = params.skins.get(id);
    return s ? `${s.isStar ? "★ " : ""}${s.weapon} | ${s.finish}` : "Skin";
  };

  const dropped = params.stock.filter((l) => lotVariationPct(l) <= -10);
  if (dropped.length)
    alerts.push({ id: "a-drop", kind: "danger", message: `${dropped.length} lotes estão mais de 10% abaixo do preço pago`, date: new Date(now - 12 * 60000).toISOString(), href: "/admin/financeiro" });

  params.stock
    .filter((l) => l.quantity <= 2 && l.status === "selling")
    .slice(0, 2)
    .forEach((l, i) =>
      alerts.push({ id: `a-low-${l.id}`, kind: "info", message: `Estoque baixo: ${name(l.skinId)} (${l.quantity} un.)`, date: new Date(now - (34 + i * 20) * 60000).toISOString(), href: "/admin/estoque" }),
    );

  const lastActivated = [...params.subStores].filter((s) => s.activatedAt).sort((a, b) => b.activatedAt!.localeCompare(a.activatedAt!))[0];
  if (lastActivated)
    alerts.push({ id: `a-sub-${lastActivated.id}`, kind: "success", message: `Sub-loja ativa: ${lastActivated.slug}`, date: lastActivated.activatedAt!, href: "/admin/sub-lojas" });

  const pending = params.subStores.filter((s) => s.status === "pending");
  if (pending.length)
    alerts.push({ id: "a-sub-pending", kind: "warning", message: `${pending.length} sub-loja(s) aguardando pagamento`, date: pending[0]!.createdAt, href: "/admin/sub-lojas" });

  const vip = [...params.clients].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 8).find((c) => daysSince(c.lastPurchaseAt, now) >= 20);
  if (vip)
    alerts.push({ id: `a-vip-${vip.id}`, kind: "warning", message: `Cliente VIP inativo há ${daysSince(vip.lastPurchaseAt, now)} dias: @${vip.handle}`, date: new Date(now - 2 * 3600000).toISOString(), href: "/admin/clientes" });

  return alerts.sort((a, b) => b.date.localeCompare(a.date));
}

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}
