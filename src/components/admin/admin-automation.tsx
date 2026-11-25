"use client";

import { useMemo } from "react";
import { Info, MessageCircle, RefreshCw, Send, Workflow } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { daysSince, fillTemplate, recoveryQueue } from "@/lib/admin-metrics";
import { useAdminStore } from "@/stores/admin-store";
import { useContactClient } from "./admin-clients";
import { Badge, Panel, Toggle, inputClass } from "./admin-ui";

export function AdminAutomation() {
  const rules = useAdminStore((s) => s.rules);
  const clients = useAdminStore((s) => s.clients);
  const enabled = useAdminStore((s) => s.recoveryEnabled);
  const setEnabled = useAdminStore((s) => s.setRecoveryEnabled);
  const updateRule = useAdminStore((s) => s.updateRule);
  const contact = useContactClient();
  const queue = useMemo(() => recoveryQueue(clients, rules), [clients, rules]);
  const sample = clients[0];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
        <Info size={15} className="mt-[1px] shrink-0" />
        <p>
          As regras abaixo definem quem entra na fila de recuperação. O disparo <strong>automático</strong> precisa da API do WhatsApp
          conectada (pendente). Enquanto isso, envie pela fila com um clique — a mensagem já vai preenchida.
        </p>
      </div>

      <Panel
        title={
          <span>
            Recuperação de clientes
            <span className="block text-[12px] font-normal text-fg-2">{enabled ? "Automação ligada" : "Automação pausada"}</span>
          </span>
        }
        icon={RefreshCw}
        actions={<Toggle checked={enabled} onChange={setEnabled} label="Ativar recuperação automática" />}
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {rules.map((r) => (
            <div key={r.id} className="rounded-[10px] border border-white/[0.06] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                  <MessageCircle size={15} className="text-muted" /> {r.label}
                </p>
                <Toggle checked={r.enabled} onChange={(v) => updateRule(r.id, { enabled: v })} label={`Ativar regra ${r.label}`} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-[12.5px] text-fg-2">
                Disparar após
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={r.days}
                  onChange={(e) => {
                    const days = Math.max(1, Math.min(365, Number(e.target.value) || 1));
                    updateRule(r.id, { days });
                  }}
                  className="h-8 w-[70px] rounded-[6px] border border-white/[0.08] bg-transparent px-2 text-center text-[13px] text-fg outline-none focus:border-primary/60"
                />
                dias sem compra
              </label>
              <label className="mt-3 block text-[12px] font-semibold text-fg-2">
                Mensagem <span className="font-normal text-faint">(use {"{nome}"})</span>
                <textarea
                  value={r.message}
                  onChange={(e) => updateRule(r.id, { message: e.target.value.slice(0, 500) })}
                  className={`${inputClass} mt-1.5 h-24 resize-y py-2 text-[12.5px]`}
                />
              </label>
              {sample && (
                <p className="mt-2 rounded-[8px] bg-white/[0.03] px-2.5 py-2 text-[12px] text-fg-2">
                  {fillTemplate(r.message, sample)}
                </p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={`Fila de recuperação (${queue.length})`}
        icon={Workflow}
        actions={!enabled && <Badge tone="neutral">Pausada</Badge>}
      >
        {queue.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {queue.slice(0, 30).map(({ client, rule, idle }) => (
              <li key={client.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-[180px] flex-1">
                  <p className="text-[13.5px] font-semibold">
                    {client.name} <span className="font-normal text-faint">@{client.handle}</span>
                  </p>
                  <p className="text-[12px] text-fg-2">
                    {idle} dias sem comprar · {formatBRL(client.totalSpent)} gastos · regra de {rule.days} dias
                    {client.lastContactAt ? ` · último contato há ${daysSince(client.lastContactAt)}d` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => contact(client, fillTemplate(rule.message, client))}
                  className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/[0.1] px-3 text-[12.5px] font-medium text-fg-2 transition-colors hover:border-white/[0.2] hover:text-white disabled:opacity-40"
                >
                  <Send size={14} /> Enviar no WhatsApp
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-[13px] text-fg-2">Nenhum cliente para recuperar agora.</p>
        )}
      </Panel>
    </div>
  );
}
