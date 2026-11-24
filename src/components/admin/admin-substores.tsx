"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CircleDollarSign, Clock, Copy, Info, MessageCircle, Plus, Store } from "lucide-react";
import type { SubStorePlan } from "@/types/admin";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import { subStoreSummary } from "@/lib/admin-metrics";
import { SUB_STORE_PLANS } from "@/data/demo/admin";
import { useAdminStore } from "@/stores/admin-store";
import { buildWhatsAppUrl } from "@/services/checkout/whatsapp";
import { toast } from "@/components/ui/toaster";
import { useQueryParam } from "./admin-hooks";
import { Badge, DemoNotice, Field, KpiCard, Modal, Panel, PrimaryButton, Table, inputClass } from "./admin-ui";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32);

function NewSubStoreModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useAdminStore((s) => s.addSubStore);
  const existing = useAdminStore((s) => s.subStores);
  const [form, setForm] = useState({ name: "", slug: "", owner: "", ownerPhone: "", plan: "pro" as SubStorePlan });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    const phone = form.ownerPhone.replace(/\D/g, "");
    if (form.name.trim().length < 2 || form.owner.trim().length < 2) return setError("Informe o nome da loja e do revendedor.");
    if (!/^[a-z0-9-]{3,32}$/.test(form.slug)) return setError("Endereço inválido: use letras minúsculas, números e hífen (3–32).");
    if (existing.some((s) => s.slug === form.slug)) return setError("Este endereço já está em uso.");
    if (phone.length < 10) return setError("WhatsApp do revendedor inválido (DDI + DDD + número).");
    add({ ...form, ownerPhone: phone, name: form.name.trim(), owner: form.owner.trim() });
    toast("Sub-loja criada — aguardando pagamento");
    setForm({ name: "", slug: "", owner: "", ownerPhone: "", plan: "pro" });
    setSlugTouched(false);
    setError("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova sub-loja">
      <div className="space-y-3.5">
        <Field label="Nome da loja">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))}
          />
        </Field>
        <Field label="Endereço" hint={`brnskins.com/loja/${form.slug || "sua-loja"}`}>
          <input
            className={inputClass}
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Revendedor">
            <input className={inputClass} value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
          </Field>
          <Field label="WhatsApp">
            <input className={inputClass} inputMode="tel" placeholder="5511999999999" value={form.ownerPhone} onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value }))} />
          </Field>
        </div>
        <Field label="Plano">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(SUB_STORE_PLANS) as SubStorePlan[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm((f) => ({ ...f, plan: p }))}
                className={cn("rounded-[10px] border px-2 py-2.5 text-center", form.plan === p ? "border-primary bg-primary/15" : "border-[#24252b] bg-[#0e0f12]")}
              >
                <span className="block text-[13px] font-semibold">{SUB_STORE_PLANS[p].label}</span>
                <span className="block text-[11.5px] text-fg-2">{formatBRL(SUB_STORE_PLANS[p].price).replace(",00", "")}/mês</span>
              </button>
            ))}
          </div>
        </Field>
        {error && <p className="text-[12.5px] text-primary">{error}</p>}
        <PrimaryButton onClick={submit}>
          <Plus size={16} /> Criar sub-loja
        </PrimaryButton>
      </div>
    </Modal>
  );
}

export function AdminSubStores() {
  const subStores = useAdminStore((s) => s.subStores);
  const confirm = useAdminStore((s) => s.confirmSubStorePayment);
  const setStatus = useAdminStore((s) => s.setSubStoreStatus);
  const action = useQueryParam("acao");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (action === "nova") setOpen(true);
  }, [action]);
  const sum = subStoreSummary(subStores);

  return (
    <div className="space-y-4">
      <DemoNotice>
        Fluxo pronto para venda automática: ao conectar o gateway de pagamento, a confirmação do pagamento libera a loja do revendedor
        sozinha. Até lá, use “Confirmar pagamento” para simular essa liberação.
      </DemoNotice>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Sub-lojas ativas" value={String(sum.active)} icon={Store} />
        <KpiCard label="Receita recorrente (mês)" value={formatBRL(sum.mrr)} icon={CircleDollarSign} />
        <KpiCard label="Aguardando pagamento" value={String(sum.pending)} icon={Clock} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(SUB_STORE_PLANS) as SubStorePlan[]).map((p) => (
          <div key={p} className="rounded-[14px] border border-[#17181c] bg-[radial-gradient(70%_80%_at_100%_0%,rgb(230_0_35/0.14),transparent_60%),#0a0b0d] p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-primary">Plano {SUB_STORE_PLANS[p].label}</p>
            <p className="mt-1 text-[22px] font-bold">
              {formatBRL(SUB_STORE_PLANS[p].price).replace(",00", "")}
              <span className="text-[13px] font-normal text-fg-2">/mês</span>
            </p>
            <p className="mt-1 text-[12.5px] text-fg-2">{subStores.filter((s) => s.plan === p && s.status === "active").length} lojas ativas neste plano</p>
          </div>
        ))}
      </div>

      <Panel
        title="Revendedores"
        icon={Store}
        actions={
          <PrimaryButton small onClick={() => setOpen(true)}>
            <Plus size={15} /> Nova Sub-Loja
          </PrimaryButton>
        }
      >
        <Table head={["Loja", "Revendedor", "Plano", "Status", "Criada em", "Ações"]} minWidth={860}>
          {subStores.map((s) => {
            const url = `brnskins.com/loja/${s.slug}`;
            return (
              <tr key={s.id}>
                <td>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-[11.5px] text-faint">{url}</p>
                </td>
                <td>{s.owner}</td>
                <td>
                  {SUB_STORE_PLANS[s.plan].label} · {formatBRL(SUB_STORE_PLANS[s.plan].price).replace(",00", "")}/mês
                </td>
                <td>
                  {s.status === "active" ? <Badge tone="success">Ativa</Badge> : s.status === "pending" ? <Badge tone="warning">Aguardando pagamento</Badge> : <Badge tone="danger">Suspensa</Badge>}
                </td>
                <td className="text-fg-2">{new Date(s.createdAt).toLocaleDateString("pt-BR")}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => {
                          confirm(s.id);
                          toast(`Pagamento confirmado — ${s.name} liberada`);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-success/15 px-2.5 text-[12px] font-semibold text-[#3ee07a] ring-1 ring-success/40"
                      >
                        <BadgeCheck size={14} /> Confirmar pagamento
                      </button>
                    )}
                    {s.status === "active" && (
                      <button type="button" onClick={() => setStatus(s.id, "suspended")} className="h-8 rounded-[6px] border border-[#2a2b31] px-2.5 text-[12px] font-semibold text-fg-2 hover:text-fg">
                        Suspender
                      </button>
                    )}
                    {s.status === "suspended" && (
                      <button type="button" onClick={() => setStatus(s.id, "active")} className="h-8 rounded-[6px] border border-primary/60 px-2.5 text-[12px] font-semibold hover:bg-primary/10">
                        Reativar
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Copiar endereço"
                      onClick={() => navigator.clipboard?.writeText(`https://${url}`).then(() => toast("Endereço copiado"))}
                      className="grid size-8 place-items-center rounded-[6px] border border-[#2a2b31] text-fg-2 hover:text-fg"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      aria-label={`WhatsApp de ${s.owner}`}
                      href={buildWhatsAppUrl(s.ownerPhone, `Olá, ${s.owner.split(" ")[0]}! Aqui é da BRN Skins sobre a sua loja ${s.name}.`) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-8 place-items-center rounded-[6px] border border-[#2a2b31] text-success hover:bg-success/10"
                    >
                      <MessageCircle size={14} />
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-4 flex items-start gap-2 text-[12px] text-faint">
          <Info size={14} className="mt-[1px] shrink-0" />
          As páginas públicas das sub-lojas serão publicadas quando o banco e o gateway estiverem conectados.
        </p>
      </Panel>
      <NewSubStoreModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
