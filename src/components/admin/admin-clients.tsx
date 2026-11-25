"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, MessageCircle, Search, UserMinus, UserPlus, UserRound, UsersRound } from "lucide-react";
import type { Client } from "@/types/admin";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import { clientStatus, clientSummary, daysSince, fillTemplate, recoveryQueue, type ClientStatus } from "@/lib/admin-metrics";
import { useAdminStore } from "@/stores/admin-store";
import { buildWhatsAppUrl } from "@/services/checkout/whatsapp";
import { toast } from "@/components/ui/toaster";
import { useQueryParam } from "./admin-hooks";
import { Badge, DemoNotice, KpiCard, KpiStrip, Panel, SelectPill, Table } from "./admin-ui";

const STATUS: Record<ClientStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  active: { label: "Ativo", tone: "success" },
  risk: { label: "Em risco", tone: "warning" },
  inactive: { label: "Inativo", tone: "danger" },
};

export function useContactClient() {
  const markContacted = useAdminStore((s) => s.markContacted);
  return (client: Client, message: string) => {
    const url = buildWhatsAppUrl(client.phone, message);
    if (!url) return toast("Telefone do cliente inválido", "error");
    window.open(url, "_blank", "noopener,noreferrer");
    markContacted(client.id);
    toast(`Mensagem aberta no WhatsApp para @${client.handle}`);
  };
}

export function AdminClients() {
  const clients = useAdminStore((s) => s.clients);
  const rules = useAdminStore((s) => s.rules);
  const contact = useContactClient();
  const qParam = useQueryParam("q");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("all");
  const [sort, setSort] = useState<"spent" | "idle" | "orders">("spent");
  useEffect(() => {
    if (qParam) setQ(qParam);
  }, [qParam]);

  const sum = useMemo(() => clientSummary(clients), [clients]);
  const queue = useMemo(() => new Map(recoveryQueue(clients, rules).map((x) => [x.client.id, x])), [clients, rules]);
  const ranking = useMemo(() => [...clients].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5), [clients]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients
      .filter((c) => (status === "all" || clientStatus(c) === status) && `${c.name} ${c.handle}`.toLowerCase().includes(term))
      .sort((a, b) =>
        sort === "spent" ? b.totalSpent - a.totalSpent : sort === "orders" ? b.orders - a.orders : daysSince(b.lastPurchaseAt) - daysSince(a.lastPurchaseAt),
      );
  }, [clients, q, status, sort]);

  return (
    <div className="space-y-4">
      <DemoNotice />
      <KpiStrip>
        <KpiCard label="Clientes totais" value={formatInt(sum.total)} icon={UsersRound} />
        <KpiCard label="Ativos (30 dias)" value={formatInt(sum.active)} icon={UserRound} />
        <KpiCard label="Novos (30 dias)" value={formatInt(sum.newOnes)} icon={UserPlus} />
        <KpiCard label="Inativos (+60 dias)" value={formatInt(sum.inactive)} icon={UserMinus} />
      </KpiStrip>
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel title="Todos os clientes" icon={UsersRound} className="xl:col-span-9">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="flex h-9 min-w-[200px] flex-1 items-center rounded-[8px] border border-white/[0.06] bg-white/[0.02] px-3 focus-within:border-white/[0.16]">
              <Search size={15} className="text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente..." className="ml-2 flex-1 bg-transparent text-[13.5px] outline-none" />
            </label>
            <SelectPill label="Status" value={status} onChange={setStatus} options={[{ id: "all", label: "Todos" }, { id: "active", label: "Ativos" }, { id: "risk", label: "Em risco" }, { id: "inactive", label: "Inativos" }]} />
            <SelectPill label="Ordenar" value={sort} onChange={setSort} options={[{ id: "spent", label: "Mais gastou" }, { id: "orders", label: "Mais pedidos" }, { id: "idle", label: "Mais tempo sem comprar" }]} />
          </div>
          <Table head={["Cliente", "Pedidos", "Upgrades", "Total gasto", "Última compra", "Status", ""]} minWidth={820}>
            {list.map((c) => {
              const st = clientStatus(c);
              const idle = daysSince(c.lastPurchaseAt);
              const inQueue = queue.get(c.id);
              return (
                <tr key={c.id}>
                  <td>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-[11.5px] text-faint">@{c.handle}</p>
                  </td>
                  <td>{formatInt(c.orders)}</td>
                  <td>{formatInt(c.upgrades)}</td>
                  <td className="font-semibold">{formatBRL(c.totalSpent)}</td>
                  <td className={cn(idle > 30 && "text-amber-300", idle > 60 && "text-[#ff6b7d]")}>{idle === 0 ? "hoje" : `há ${idle} dias`}</td>
                  <td><Badge tone={STATUS[st].tone}>{STATUS[st].label}</Badge></td>
                  <td>
                    <button
                      type="button"
                      onClick={() => contact(c, inQueue ? fillTemplate(inQueue.rule.message, c) : `Fala, ${c.name.split(" ")[0]}! Aqui é da BRN Skins.`)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[12px] font-semibold ring-1",
                        inQueue ? "bg-success/15 text-[#4ade80] ring-success/40" : "text-fg-2 ring-[#2a2b31] hover:text-fg",
                      )}
                    >
                      <MessageCircle size={14} /> {inQueue ? "Recuperar" : "Conversar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        </Panel>
        <Panel title="Top clientes" icon={Crown} className="xl:col-span-3">
          <ol className="space-y-3">
            {ranking.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold", i === 0 ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40" : "bg-white/[0.05] text-fg-2")}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">@{c.handle}</p>
                  <p className="text-[11.5px] text-faint">{c.orders} pedidos · há {daysSince(c.lastPurchaseAt)} dias</p>
                </div>
                <span className="text-[13px] font-bold">{formatBRL(c.totalSpent)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
