"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Pencil, Plus, Users, X } from "lucide-react";
import {
  payApprovedCommissions,
  saveInfluencer,
  setConversionStatus,
  setInfluencerActive,
  type ActionResult,
} from "@/app/admin/(panel)/influenciadores/actions";
import { REFERRAL, slugifyCode } from "@/config/referral";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { formatBRL, formatInt } from "@/lib/format";
import { timeAgo } from "@/lib/admin-metrics";
import type { Influencer, InfluencerStats, ReferralConversion, ReferralDashboard, ReferralPeriod, ReferralStatus } from "@/services/referrals/types";
import { Badge, Field, Toggle, inputClass } from "./admin-ui";

type Row = Influencer & { stats: InfluencerStats };

const STATUS: Record<ReferralStatus, { label: string; tone: "warning" | "success" | "neutral" | "danger" }> = {
  pending: { label: "Pendente", tone: "warning" },
  approved: { label: "Aprovada", tone: "success" },
  paid: { label: "Paga", tone: "neutral" },
  canceled: { label: "Cancelada", tone: "danger" },
};
const AVATAR_BG = ["#3b0a12", "#0f2a1a", "#10223a", "#2d1a05", "#241336", "#062a2a"];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const conversionRate = (s: InfluencerStats) => (s.visitors ? (s.conversions / s.visitors) * 100 : 0);
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function useLink() {
  return (code: string) => `${typeof window === "undefined" ? "" : window.location.origin}/r/${code}`;
}

function useAction() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, success?: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast(res.error, "error");
      else {
        if (success) toast(success);
        after?.();
      }
    });
  return { pending, run };
}

/* ------------------------------------------------------------------ peças */

function Segmented({ value, onChange }: { value: ReferralPeriod; onChange: (v: ReferralPeriod) => void }) {
  const options: { id: ReferralPeriod; label: string }[] = [
    { id: "7", label: "7 dias" },
    { id: "30", label: "30 dias" },
    { id: "all", label: "Tudo" },
  ];
  return (
    <div role="radiogroup" aria-label="Período" className="flex rounded-full border border-white/[0.06] bg-black/30 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("h-7 whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition-colors", value === o.id ? "bg-white text-black" : "text-muted hover:text-fg")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CopyLink({ code, compact }: { code: string; compact?: boolean }) {
  const link = useLink();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link(code));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast("Não foi possível copiar", "error");
        }
      }}
      title="Copiar link de indicação"
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[12px] text-muted transition-colors hover:border-white/[0.18] hover:text-white",
        compact && "py-0.5",
      )}
    >
      <span className="truncate">/r/{code}</span>
      {copied ? <Check size={12} className="shrink-0 text-[#4ade80]" /> : <Copy size={12} className="shrink-0" />}
    </button>
  );
}

function Avatar({ name, index, size = 40 }: { name: string; index: number; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white/90 ring-1 ring-white/[0.08]"
      style={{ width: size, height: size, background: AVATAR_BG[index % AVATAR_BG.length] }}
    >
      {initials(name)}
    </span>
  );
}

function Stat({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-faint">{label}</p>
      <p className={cn("truncate text-[13.5px] tabular-nums", strong ? "font-semibold text-white" : "text-fg")}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ modais */

function Dialog({ open, onClose, title, wide, children }: { open: boolean; onClose: () => void; title: ReactNode; wide?: boolean; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/70 sm:place-items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("card-premium max-h-[90dvh] w-full overflow-y-auto rounded-b-none p-6 sm:rounded-[16px]", wide ? "sm:max-w-[720px]" : "sm:max-w-[480px]")}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 text-[16px] font-semibold">{title}</div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-white">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfluencerForm({ initial, onDone }: { initial: Row | null; onDone: () => void }) {
  const link = useLink();
  const { pending, run } = useAction();
  const [codeTouched, setCodeTouched] = useState(Boolean(initial));
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    code: initial?.code ?? "",
    commissionRate: String(initial?.commissionRate ?? REFERRAL.defaultCommission),
    active: initial?.active ?? true,
    contact: initial?.contact ?? "",
    pixKey: initial?.pixKey ?? "",
    notes: initial?.notes ?? "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveInfluencer({
              id: initial?.id,
              name: form.name,
              code: form.code,
              commissionRate: Number(form.commissionRate.replace(",", ".")),
              active: form.active,
              contact: form.contact,
              pixKey: form.pixKey,
              notes: form.notes,
            }),
          initial ? "Influenciador atualizado" : "Influenciador criado",
          onDone,
        );
      }}
    >
      <Field label="Nome">
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => set({ name: e.target.value, ...(codeTouched ? {} : { code: slugifyCode(e.target.value) }) })}
          placeholder="Ex.: Paulo Souza"
          required
        />
      </Field>
      <Field label="Link de indicação" hint={form.code ? link(form.code) : "Letras minúsculas, números, - ou _"}>
        <div className="flex items-center rounded-[8px] border border-white/[0.08] bg-[#0e0f11] focus-within:border-primary/60">
          <span className="pl-3 text-[13px] text-faint">/r/</span>
          <input
            aria-label="Código do link"
            className="h-10 flex-1 bg-transparent px-1 text-[13.5px] outline-none"
            value={form.code}
            onChange={(e) => {
              setCodeTouched(true);
              set({ code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") });
            }}
            placeholder="paulo"
            required
          />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Comissão (%)">
          <input
            className={inputClass}
            inputMode="decimal"
            value={form.commissionRate}
            onChange={(e) => set({ commissionRate: e.target.value.replace(/[^\d.,]/g, "") })}
            required
          />
        </Field>
        <Field label="Contato">
          <input className={inputClass} value={form.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="@instagram ou WhatsApp" />
        </Field>
      </div>
      <Field label="Chave Pix" hint="Para pagar as comissões">
        <input className={inputClass} value={form.pixKey} onChange={(e) => set({ pixKey: e.target.value })} />
      </Field>
      <Field label="Observações">
        <textarea className={cn(inputClass, "h-20 resize-none py-2")} value={form.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={400} />
      </Field>
      <div className="flex items-center justify-between rounded-[10px] border border-white/[0.06] px-3 py-2.5">
        <span className="text-[13px]">
          Link ativo
          <span className="block text-[11.5px] text-muted">Desativado, o link não conta mais visitas nem comissões.</span>
        </span>
        <Toggle checked={form.active} onChange={(v) => set({ active: v })} label="Link ativo" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-10 w-full rounded-full bg-primary text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Salvando..." : initial ? "Salvar alterações" : "Criar influenciador"}
      </button>
    </form>
  );
}

function ConversionActions({ c }: { c: ReferralConversion }) {
  const { pending, run } = useAction();
  const btn = "h-7 rounded-full border border-white/[0.1] px-2.5 text-[11.5px] font-medium text-fg-2 transition-colors hover:border-white/[0.22] hover:text-white disabled:opacity-50";
  return (
    <div className="flex justify-end gap-1.5">
      {c.status === "pending" && (
        <>
          <button type="button" disabled={pending} className={btn} onClick={() => run(() => setConversionStatus(c.id, "approved"), "Comissão aprovada")}>
            Aprovar
          </button>
          <button type="button" disabled={pending} className={btn} onClick={() => run(() => setConversionStatus(c.id, "canceled"), "Comissão cancelada")}>
            Cancelar
          </button>
        </>
      )}
      {c.status === "approved" && (
        <button type="button" disabled={pending} className={btn} onClick={() => run(() => setConversionStatus(c.id, "paid"), "Marcada como paga")}>
          Marcar paga
        </button>
      )}
      {c.status === "canceled" && (
        <button type="button" disabled={pending} className={btn} onClick={() => run(() => setConversionStatus(c.id, "pending"), "Comissão reaberta")}>
          Reabrir
        </button>
      )}
    </div>
  );
}

function ConversionList({ items, names }: { items: ReferralConversion[]; names?: Map<string, string> }) {
  if (!items.length) return <p className="py-8 text-center text-[13px] text-muted">Nenhuma venda indicada ainda.</p>;
  return (
    <ul className="divide-y divide-white/[0.05]">
      {items.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
          <div className="min-w-[160px] flex-1">
            <p className="text-[13px] font-medium">
              {names ? `${names.get(c.influencerId) ?? "—"} · ` : ""}
              {c.source === "upgrade" ? "Upgrade" : "Pedido"} {c.reference}
            </p>
            <p className="text-[11.5px] text-faint">
              {timeAgo(c.createdAt)} · venda {formatBRL(c.amount)} · {pct(c.commissionRate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13.5px] font-semibold tabular-nums">{formatBRL(c.commission)}</p>
            <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
          </div>
          <div className="w-full sm:w-auto">
            <ConversionActions c={c} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function InfluencerDetail({ row, index, conversions, onEdit }: { row: Row; index: number; conversions: ReferralConversion[]; onEdit: () => void }) {
  const { pending, run } = useAction();
  const s = row.stats;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={row.name} index={index} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{row.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CopyLink code={row.code} />
            {row.contact && <span className="text-[12px] text-muted">{row.contact}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.1] px-3 text-[12.5px] text-fg-2 hover:border-white/[0.22] hover:text-white"
        >
          <Pencil size={13} /> Editar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[14px] border border-white/[0.06] bg-black/20 p-4 sm:grid-cols-4">
        <Stat label="Visitantes" value={formatInt(s.visitors)} strong />
        <Stat label="Vendas" value={formatInt(s.conversions)} strong />
        <Stat label="Conversão" value={pct(conversionRate(s))} />
        <Stat label="Faturamento gerado" value={formatBRL(s.revenue)} />
        <Stat label="Comissão" value={pct(row.commissionRate)} />
        <Stat label="Pendente" value={formatBRL(s.commissionPending)} />
        <Stat label="A pagar" value={formatBRL(s.commissionApproved)} strong />
        <Stat label="Já pago" value={formatBRL(s.commissionPaid)} />
      </div>

      {row.pixKey && <p className="text-[12.5px] text-muted">Pix: <span className="text-fg">{row.pixKey}</span></p>}

      {s.commissionApproved > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => payApprovedCommissions(row.id), "Comissões marcadas como pagas")}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          Marcar {formatBRL(s.commissionApproved)} como pago
        </button>
      )}

      <div>
        <p className="mb-1 text-[13px] font-medium text-fg-2">Vendas indicadas</p>
        <ConversionList items={conversions} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ página */

const MEDAL = ["#ff2d4b", "#d9dbe1", "#c98a4b"];

/** Anel de progresso simples. */
function Ring({ value, size = 84, stroke = 7, color = "#f5f5f5", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
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
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Pódio: os três que mais trouxeram visitantes (2º · 1º · 3º). */
function Podium({ rows, indexById, onOpen }: { rows: Row[]; indexById: Map<string, number>; onOpen: (id: string) => void }) {
  const top = rows.slice(0, 3);
  const max = Math.max(1, ...top.map((r) => r.stats.visitors));
  const order = [top[1], top[0], top[2]];
  const ranks = [2, 1, 3];
  return (
    <section className="card-premium flex flex-col p-5 xl:col-span-7">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Quem mais trouxe gente</h2>
        <span className="text-[12px] text-muted">visitantes únicos no período</span>
      </div>
      {!top.length ? (
        <p className="grid flex-1 place-items-center py-10 text-[13px] text-muted">O pódio aparece quando houver influenciadores.</p>
      ) : (
        <div className="mt-5 grid flex-1 grid-cols-3 items-end gap-3">
          {order.map((r, i) =>
            r ? (
              <button key={r.id} type="button" onClick={() => onOpen(r.id)} className="group flex flex-col items-center text-center">
                <span className="relative">
                  <Avatar name={r.name} index={indexById.get(r.id) ?? 0} size={ranks[i] === 1 ? 64 : 52} />
                  <span
                    className="absolute -bottom-1 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full text-[10.5px] font-bold text-black ring-2 ring-[#0b0c0f]"
                    style={{ background: MEDAL[ranks[i]! - 1] }}
                  >
                    {ranks[i]}
                  </span>
                </span>
                <span className="mt-3 max-w-full truncate text-[13.5px] font-semibold group-hover:text-white">{r.name}</span>
                <span className="text-[11.5px] text-muted">/r/{r.code}</span>
                <div
                  className={cn(
                    "mt-3 flex w-full flex-col items-center justify-start rounded-t-[14px] border border-b-0 pt-3",
                    ranks[i] === 1
                      ? "border-[#ff2d4b]/40 bg-[linear-gradient(180deg,rgb(230_0_35/0.28),rgb(230_0_35/0.02))]"
                      : "border-white/[0.08] bg-[linear-gradient(180deg,rgb(255_255_255/0.07),rgb(255_255_255/0.01))]",
                  )}
                  style={{ height: `${56 + (r.stats.visitors / max) * 96}px` }}
                >
                  <span className="text-[22px] font-semibold tabular-nums leading-none">{formatInt(r.stats.visitors)}</span>
                  <span className="mt-1 text-[11px] text-muted">{formatInt(r.stats.conversions)} vendas</span>
                </div>
              </button>
            ) : (
              <div key={`empty-${i}`} className="flex flex-col items-center">
                <span className="grid size-[52px] place-items-center rounded-full border border-dashed border-white/[0.12] text-[12px] text-faint">{ranks[i]}º</span>
                <div className="mt-[62px] h-[56px] w-full rounded-t-[14px] border border-b-0 border-dashed border-white/[0.08]" />
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function PayoutHero({
  approved,
  pending,
  paid,
  payees,
  indexById,
  onOpen,
  onQueue,
}: {
  approved: number;
  pending: number;
  paid: number;
  payees: Row[];
  indexById: Map<string, number>;
  onOpen: (id: string) => void;
  onQueue: () => void;
}) {
  return (
    <section className="card-premium-red flex flex-col p-6 xl:col-span-5">
      <p className="text-[13px] font-medium text-[#ffb3be]">Comissão a pagar</p>
      <p className="mt-2 whitespace-nowrap text-[34px] font-semibold leading-none tracking-[-0.03em] sm:text-[42px]">{formatBRL(approved)}</p>
      <p className="mt-2 text-[12.5px] text-muted">aprovadas e ainda não pagas</p>

      <ul className="mt-5 space-y-1">
        {payees.slice(0, 3).map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="flex w-full items-center gap-3 rounded-[12px] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <Avatar name={r.name} index={indexById.get(r.id) ?? 0} size={30} />
              <span className="min-w-0 flex-1 truncate text-[13px]">{r.name}</span>
              <span className="text-[13px] font-semibold tabular-nums">{formatBRL(r.stats.commissionApproved)}</span>
            </button>
          </li>
        ))}
        {!payees.length && <li className="px-2 text-[12.5px] text-muted">Nenhuma comissão aprovada para pagar agora.</li>}
      </ul>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <button
          type="button"
          onClick={onQueue}
          className="rounded-[14px] border border-white/[0.08] bg-black/25 p-3 text-left transition-colors hover:border-white/[0.18]"
        >
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <span className="size-1.5 rounded-full bg-amber-400" /> Aguardando aprovação
          </span>
          <span className="mt-1 block text-[16px] font-semibold tabular-nums">{formatBRL(pending)}</span>
        </button>
        <div className="rounded-[14px] border border-white/[0.08] bg-black/25 p-3">
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <span className="size-1.5 rounded-full bg-[#4ade80]" /> Já pago
          </span>
          <span className="mt-1 block text-[16px] font-semibold tabular-nums">{formatBRL(paid)}</span>
        </div>
      </div>
    </section>
  );
}

function InfluencerCard({
  row,
  rank,
  index,
  share,
  onOpen,
  onEdit,
  onToggle,
}: {
  row: Row;
  rank: number;
  index: number;
  share: number;
  onOpen: () => void;
  onEdit: () => void;
  onToggle: (v: boolean) => void;
}) {
  const s = row.stats;
  return (
    <li className={cn("card-premium group relative flex flex-col p-4 transition-transform duration-200 hover:-translate-y-0.5", !row.active && "opacity-60")}>
      <button type="button" onClick={onOpen} aria-label={`Ver detalhes de ${row.name}`} className="absolute inset-0 z-0 rounded-[16px]" />
      <div className="pointer-events-none relative flex items-start gap-3">
        <Avatar name={row.name} index={index} size={44} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-[14px] font-semibold">
            {row.name}
            {!row.active && <Badge tone="neutral">Pausado</Badge>}
          </p>
          <div className="pointer-events-auto relative z-10 mt-1 w-fit max-w-full">
            <CopyLink code={row.code} compact />
          </div>
        </div>
        <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-fg-2">#{rank}</span>
      </div>

      <div className="pointer-events-none relative mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{formatInt(s.visitors)}</p>
          <p className="mt-1 text-[11.5px] text-muted">visitantes · {pct(share * 100)} do total</p>
        </div>
        <Ring value={conversionRate(s) / 100} size={52} stroke={5} color={rank === 1 ? "#ff2d4b" : "#f5f5f5"}>
          <span className="text-[10.5px] font-semibold">{pct(conversionRate(s))}</span>
        </Ring>
      </div>
      <div className="pointer-events-none relative mt-3 h-1 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full"
          style={{ width: `${share * 100}%`, background: rank === 1 ? "linear-gradient(90deg,#b5001b,#ff2d4b)" : "rgb(255 255 255 / 0.4)" }}
        />
      </div>

      <div className="pointer-events-none relative mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3">
        <Stat label="Vendas" value={formatInt(s.conversions)} />
        <Stat label="Comissão" value={pct(row.commissionRate)} />
        <Stat label="A pagar" value={formatBRL(s.commissionApproved)} strong />
      </div>

      <div className="relative z-10 mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="text-[11.5px] text-muted">{row.active ? "Link ativo" : "Link pausado"}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar ${row.name}`}
            className="grid size-8 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-white"
          >
            <Pencil size={14} />
          </button>
          <Toggle checked={row.active} onChange={onToggle} label={`Link de ${row.name} ativo`} />
        </div>
      </div>
    </li>
  );
}

export function AdminInfluencers({ data }: { data: ReferralDashboard }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { run } = useAction();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(
    () => [...data.influencers].sort((a, b) => b.stats.visitors - a.stats.visitors || b.stats.revenue - a.stats.revenue),
    [data.influencers],
  );
  const indexById = useMemo(() => new Map(data.influencers.map((r, i) => [r.id, i])), [data.influencers]);
  const names = useMemo(() => new Map(data.influencers.map((r) => [r.id, r.name])), [data.influencers]);
  const totals = rows.reduce(
    (t, r) => ({
      visitors: t.visitors + r.stats.visitors,
      conversions: t.conversions + r.stats.conversions,
      revenue: t.revenue + r.stats.revenue,
      pending: t.pending + r.stats.commissionPending,
      approved: t.approved + r.stats.commissionApproved,
      paid: t.paid + r.stats.commissionPaid,
    }),
    { visitors: 0, conversions: 0, revenue: 0, pending: 0, approved: 0, paid: 0 },
  );
  const pendingQueue = data.conversions.filter((c) => c.status === "pending");
  const detail = rows.find((r) => r.id === detailId) ?? null;
  const conversion = totals.visitors ? (totals.conversions / totals.visitors) * 100 : 0;

  const setPeriod = (p: ReferralPeriod) => {
    const next = new URLSearchParams(params);
    if (p === "30") next.delete("periodo");
    else next.set("periodo", p);
    router.push(`${pathname}${next.size ? `?${next}` : ""}`);
  };

  if (!data.configured) {
    return (
      <p className="card-premium p-6 text-[13.5px] text-muted">
        O Supabase não está configurado no servidor. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Cada influenciador tem um link próprio. Quem chega por ele fica marcado por {REFERRAL.attributionDays} dias.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={data.period} onChange={setPeriod} />
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_rgb(230_0_35/0.9)] transition-colors hover:bg-primary-hover"
          >
            <Plus size={15} /> Novo influenciador
          </button>
        </div>
      </div>

      {/* Destaques */}
      <div className="grid gap-4 xl:grid-cols-12">
        <PayoutHero
          approved={totals.approved}
          pending={totals.pending}
          paid={totals.paid}
          payees={[...rows].filter((r) => r.stats.commissionApproved > 0).sort((a, b) => b.stats.commissionApproved - a.stats.commissionApproved)}
          indexById={indexById}
          onOpen={setDetailId}
          onQueue={() => document.getElementById("fila-comissoes")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
        <Podium rows={rows} indexById={indexById} onOpen={setDetailId} />
      </div>

      {/* Números em formatos diferentes */}
      <div className="grid gap-4 sm:grid-cols-3">
        <section className="card-premium p-5">
          <p className="text-[13px] font-medium text-fg-2">Visitantes indicados</p>
          <p className="mt-2 text-[26px] font-semibold tracking-[-0.02em] tabular-nums">{formatInt(totals.visitors)}</p>
          <div className="mt-3 flex h-2 gap-[3px] overflow-hidden rounded-full" aria-hidden>
            {rows
              .filter((r) => r.stats.visitors > 0)
              .map((r, i) => (
                <span
                  key={r.id}
                  title={`${r.name}: ${r.stats.visitors}`}
                  style={{ width: `${(r.stats.visitors / Math.max(1, totals.visitors)) * 100}%`, background: i === 0 ? "#ff2d4b" : `rgb(255 255 255 / ${Math.max(0.12, 0.5 - i * 0.12)})` }}
                />
              ))}
            {!totals.visitors && <span className="w-full bg-white/[0.05]" />}
          </div>
          <p className="mt-2 text-[11.5px] text-muted">pessoas únicas que chegaram pelos links</p>
        </section>

        <section className="card-premium relative overflow-hidden p-5">
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full border border-white/[0.05]" />
          <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 size-20 rounded-full border border-white/[0.06]" />
          <p className="text-[13px] font-medium text-fg-2">Vendas indicadas</p>
          <p className="mt-2 text-[26px] font-semibold tracking-[-0.02em] tabular-nums">{formatBRL(totals.revenue)}</p>
          <p className="mt-1 text-[11.5px] text-muted">{formatInt(totals.conversions)} pedidos e upgrades</p>
        </section>

        <section className="card-premium flex items-center gap-4 p-5">
          <Ring value={conversion / 100} size={76} color="#ff2d4b">
            <span className="text-[14px] font-semibold">{pct(conversion)}</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-fg-2">Conversão</p>
            <p className="mt-1 text-[12px] leading-snug text-muted">De cada 100 visitantes indicados, quantos enviaram pedido.</p>
          </div>
        </section>
      </div>

      {/* Influenciadores + fila de aprovação */}
      <div className="grid gap-5 xl:grid-cols-12">
        <section className="xl:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Influenciadores</h2>
            <span className="text-[12px] text-muted">{formatInt(rows.filter((r) => r.active).length)} ativos de {formatInt(rows.length)}</span>
          </div>
          {!rows.length ? (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="card-premium grid w-full place-items-center gap-3 py-14 text-center transition-colors hover:border-white/[0.2]"
            >
              <span className="grid size-12 place-items-center rounded-full bg-white/[0.05] text-muted">
                <Users size={20} />
              </span>
              <span className="text-[13.5px] text-muted">Nenhum influenciador ainda. Clique para criar o primeiro link.</span>
            </button>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {rows.map((r, i) => (
                <InfluencerCard
                  key={r.id}
                  row={r}
                  rank={i + 1}
                  index={indexById.get(r.id) ?? 0}
                  share={totals.visitors ? r.stats.visitors / totals.visitors : 0}
                  onOpen={() => setDetailId(r.id)}
                  onEdit={() => setEditing(r)}
                  onToggle={(v) => run(() => setInfluencerActive(r.id, v), v ? "Link ativado" : "Link pausado")}
                />
              ))}
            </ul>
          )}
        </section>

        <section id="fila-comissoes" className="card-premium flex scroll-mt-24 flex-col self-start p-5 xl:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Comissões para aprovar</h2>
            <span
              className={cn(
                "grid h-6 min-w-6 place-items-center rounded-full px-2 text-[11.5px] font-semibold",
                pendingQueue.length ? "bg-primary text-white" : "bg-white/[0.06] text-muted",
              )}
            >
              {pendingQueue.length}
            </span>
          </div>
          <p className="mb-1 mt-1 text-[12px] leading-relaxed text-muted">Entram aqui quando um indicado envia pedido ou upgrade. Aprove quando a venda se confirmar.</p>
          <ConversionList items={pendingQueue.slice(0, 8)} names={names} />
        </section>
      </div>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Novo influenciador" : "Editar influenciador"}>
        {editing !== null && <InfluencerForm initial={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>

      <Dialog open={detail !== null} onClose={() => setDetailId(null)} title="Detalhes do influenciador" wide>
        {detail && (
          <InfluencerDetail
            row={detail}
            index={indexById.get(detail.id) ?? 0}
            conversions={data.conversions.filter((c) => c.influencerId === detail.id)}
            onEdit={() => {
              setDetailId(null);
              setEditing(detail);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
