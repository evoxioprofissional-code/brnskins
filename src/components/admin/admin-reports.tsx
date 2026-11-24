"use client";

import { ArrowDownToLine, ArrowUpFromLine, FileDown, RotateCcw, Store, UsersRound, Warehouse } from "lucide-react";
import { formatInt } from "@/lib/format";
import { daysSince } from "@/lib/admin-metrics";
import { SUB_STORE_PLANS } from "@/data/demo/admin";
import { useAdminStore } from "@/stores/admin-store";
import { toast } from "@/components/ui/toaster";
import { useAdminData } from "./admin-data-provider";
import { downloadCsv, useSkinMap } from "./admin-hooks";
import { DemoNotice, GhostButton, Panel } from "./admin-ui";

export function AdminReports() {
  const { skins } = useAdminData();
  const s = useAdminStore();
  const { name } = useSkinMap();
  const date = new Date().toISOString().slice(0, 10);

  const reports = [
    {
      icon: ArrowUpFromLine,
      title: "Vendas",
      text: `${formatInt(s.movements.filter((m) => m.type === "out").length)} saídas registradas`,
      run: () =>
        downloadCsv(`vendas-${date}.csv`, [
          ["Data", "Skin", "Qtd", "Valor", "Custo", "Lucro"],
          ...s.movements.filter((m) => m.type === "out").map((m) => [new Date(m.date).toLocaleString("pt-BR"), name(m.skinId), m.quantity, m.amount, m.cost ?? 0, m.amount - (m.cost ?? 0)]),
        ]),
    },
    {
      icon: ArrowDownToLine,
      title: "Compras",
      text: `${formatInt(s.movements.filter((m) => m.type === "in").length)} entradas registradas`,
      run: () =>
        downloadCsv(`compras-${date}.csv`, [
          ["Data", "Skin", "Qtd", "Valor"],
          ...s.movements.filter((m) => m.type === "in").map((m) => [new Date(m.date).toLocaleString("pt-BR"), name(m.skinId), m.quantity, m.amount]),
        ]),
    },
    {
      icon: Warehouse,
      title: "Estoque",
      text: `${formatInt(s.stock.length)} lotes`,
      run: () =>
        downloadCsv(`estoque-${date}.csv`, [
          ["Skin", "Condição", "Qtd", "Custo un.", "Mercado un.", "Resultado"],
          ...s.stock.map((l) => [name(l.skinId), l.wear, l.quantity, l.unitCost, l.marketPrice, Math.round((l.marketPrice - l.unitCost) * l.quantity * 100) / 100]),
        ]),
    },
    {
      icon: UsersRound,
      title: "Clientes",
      text: `${formatInt(s.clients.length)} clientes`,
      run: () =>
        downloadCsv(`clientes-${date}.csv`, [
          ["Nome", "Usuário", "Pedidos", "Upgrades", "Total gasto", "Dias sem comprar"],
          ...s.clients.map((c) => [c.name, `@${c.handle}`, c.orders, c.upgrades, c.totalSpent, daysSince(c.lastPurchaseAt)]),
        ]),
    },
    {
      icon: Store,
      title: "Sub-lojas",
      text: `${formatInt(s.subStores.length)} revendedores`,
      run: () =>
        downloadCsv(`sub-lojas-${date}.csv`, [
          ["Loja", "Endereço", "Revendedor", "Plano", "Mensalidade", "Status"],
          ...s.subStores.map((x) => [x.name, `/loja/${x.slug}`, x.owner, SUB_STORE_PLANS[x.plan].label, SUB_STORE_PLANS[x.plan].price, x.status]),
        ]),
    },
  ];

  return (
    <div className="space-y-4">
      <DemoNotice>Os relatórios são gerados em CSV (abre direto no Excel) a partir dos dados atuais do painel.</DemoNotice>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <Panel key={r.title} title={r.title} icon={r.icon}>
            <p className="text-[13px] text-fg-2">{r.text}</p>
            <div className="mt-4">
              <GhostButton onClick={r.run}>
                <FileDown size={16} /> Baixar CSV
              </GhostButton>
            </div>
          </Panel>
        ))}
        <Panel title="Dados de demonstração" icon={RotateCcw}>
          <p className="text-[13px] text-fg-2">Restaura estoque, movimentações, clientes e sub-lojas de exemplo.</p>
          <div className="mt-4">
            <GhostButton
              onClick={() => {
                s.resetDemo(skins);
                toast("Dados de demonstração restaurados");
              }}
            >
              <RotateCcw size={16} /> Restaurar
            </GhostButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
