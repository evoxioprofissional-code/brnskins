"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, FileDown, Scale, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import { useAdminStore } from "@/stores/admin-store";
import { downloadCsv } from "./admin-hooks";
import { DemoNotice, GhostButton, KpiCard, KpiStrip, Panel, SelectPill, Table } from "./admin-ui";

export function AdminMovements() {
  const movements = useAdminStore((s) => s.movements);
  const clients = useAdminStore((s) => s.clients);
  const [type, setType] = useState<"all" | "in" | "out">("all");
  const [days, setDays] = useState<"7" | "30" | "60">("30");
  const [q, setQ] = useState("");
  const clientName = useMemo(() => new Map(clients.map((c) => [c.id, `@${c.handle}`])), [clients]);

  const list = useMemo(() => {
    const since = Date.now() - Number(days) * 86_400_000;
    return movements.filter(
      (m) =>
        new Date(m.date).getTime() >= since &&
        (type === "all" || m.type === type) &&
        m.description.toLowerCase().includes(q.trim().toLowerCase()),
    );
  }, [movements, days, type, q]);

  const inSum = list.filter((m) => m.type === "in").reduce((s, m) => s + m.amount, 0);
  const outSum = list.filter((m) => m.type === "out").reduce((s, m) => s + m.amount, 0);

  return (
    <div className="space-y-4">
      <DemoNotice />
      <KpiStrip>
        <KpiCard label="Entradas (compras)" value={formatBRL(inSum)} icon={ArrowDownToLine} />
        <KpiCard label="Saídas (vendas)" value={formatBRL(outSum)} icon={ArrowUpFromLine} />
        <KpiCard label="Resultado" value={`${outSum - inSum >= 0 ? "+" : "-"} ${formatBRL(Math.abs(outSum - inSum))}`} icon={Scale} />
      </KpiStrip>
      <Panel
        title="Movimentações"
        icon={ArrowRightLeft}
        actions={
          <GhostButton
            onClick={() =>
              downloadCsv(`movimentacoes-${days}d.csv`, [
                ["Data", "Tipo", "Descrição", "Qtd", "Valor", "Custo", "Cliente"],
                ...list.map((m) => [new Date(m.date).toLocaleString("pt-BR"), m.type === "in" ? "Entrada" : "Saída", m.description, m.quantity, m.amount, m.cost ?? "", m.clientId ? clientName.get(m.clientId) ?? "" : ""]),
              ])
            }
          >
            <FileDown size={16} /> Exportar CSV
          </GhostButton>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-[220px] flex-1 items-center rounded-[8px] border border-white/[0.06] bg-white/[0.02] px-3 focus-within:border-white/[0.16]">
            <Search size={15} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar movimentação..." className="ml-2 flex-1 bg-transparent text-[13.5px] outline-none" />
          </label>
          <SelectPill label="Tipo" value={type} onChange={setType} options={[{ id: "all", label: "Todas" }, { id: "in", label: "Entradas" }, { id: "out", label: "Saídas" }]} />
          <SelectPill label="Período" value={days} onChange={setDays} options={[{ id: "7", label: "7 dias" }, { id: "30", label: "30 dias" }, { id: "60", label: "60 dias" }]} />
        </div>
        <Table head={["Data", "Tipo", "Descrição", "Qtd", "Valor", "Lucro", "Cliente"]} minWidth={820}>
          {list.slice(0, 150).map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap text-fg-2">{new Date(m.date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
              <td>
                <span className={cn("inline-flex items-center gap-1.5 font-semibold", m.type === "in" ? "text-sky-300" : "text-[#4ade80]")}>
                  {m.type === "in" ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                  {m.type === "in" ? "Entrada" : "Saída"}
                </span>
              </td>
              <td>{m.description}</td>
              <td>{formatInt(m.quantity)}</td>
              <td className="font-semibold">{formatBRL(m.amount)}</td>
              <td className="text-[#4ade80]">{m.type === "out" ? formatBRL(m.amount - (m.cost ?? 0)) : "—"}</td>
              <td className="text-fg-2">{m.clientId ? clientName.get(m.clientId) : "—"}</td>
            </tr>
          ))}
        </Table>
        {list.length > 150 && <p className="pt-3 text-center text-[12px] text-faint">Mostrando 150 de {formatInt(list.length)} — exporte o CSV para ver tudo.</p>}
      </Panel>
    </div>
  );
}
