import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Linha de descrição/ações das páginas (o título fica na topbar). */
export function AdminPageHeader({ description, actions }: { title?: string; description?: string; actions?: ReactNode }) {
  if (!description && !actions) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {description ? <p className="text-[13px] text-fg-2">{description}</p> : <span />}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const panelClass =
  "rounded-[14px] border border-[#17181c] bg-[linear-gradient(180deg,#0b0c0f_0%,#08090b_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.02)]";

export function Panel({
  title,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(panelClass, "flex flex-col", className)}>
      {(title || actions) && (
        <header className="flex min-h-[54px] items-center justify-between gap-2 border-b border-[#141519] px-4 py-2.5 lg:px-[18px]">
          <h2 className="flex min-w-0 items-center gap-[10px] text-[15px] font-semibold">
            {Icon && <Icon size={19} strokeWidth={1.8} className="text-fg" />}
            {title}
          </h2>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("flex-1 p-4 lg:px-[18px]", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Compatível com as páginas anteriores. */
export function AdminCard({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <Panel title={title} actions={actions} className={className}>
      {children}
    </Panel>
  );
}

export function Trend({ value: raw, suffix = "%", invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const value = Math.abs(raw) < 0.05 ? 0 : raw;
  const positive = invert ? value < 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex h-[24px] shrink-0 items-center gap-[4px] rounded-[7px] px-[8px] text-[12px] font-semibold",
        positive ? "bg-[#0b2a17] text-[#3ee07a] ring-1 ring-[#14532d]/70" : "bg-[#2a0b10] text-[#ff5a6e] ring-1 ring-[#5a0c18]/70",
      )}
    >
      <Icon size={12} strokeWidth={2.6} aria-hidden />
      {value > 0 ? "+" : ""}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
}

export function KpiCard({ label, value, trend, icon: Icon, hint }: { label: string; value: string; trend?: number; icon: LucideIcon; hint?: string }) {
  return (
    <div className={cn(panelClass, "flex items-center gap-4 px-4 py-4 lg:px-[18px]")}>
      <span className="grid size-[52px] shrink-0 place-items-center rounded-[12px] border border-[#1d1e23] bg-[#101114] text-fg">
        <Icon size={24} strokeWidth={1.6} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[12.5px] text-fg-2">{label}</p>
          {trend !== undefined && <Trend value={trend} />}
        </div>
        <p className="mt-[2px] truncate text-[23px] font-bold leading-[30px] tracking-[-0.015em]">{value}</p>
        {hint && <p className="text-[11px] text-faint">{hint}</p>}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: ReactNode }) {
  return (
    <div className={cn(panelClass, "flex items-start justify-between p-4")}>
      <div>
        <p className="text-[12.5px] text-fg-2">{label}</p>
        <p className="mt-1.5 text-[22px] font-bold tracking-[-0.01em]">{value}</p>
        {hint && <p className="mt-0.5 text-[11.5px] text-faint">{hint}</p>}
      </div>
      <span className="grid size-10 place-items-center rounded-[10px] bg-primary/10 text-primary ring-1 ring-primary/25">{icon}</span>
    </div>
  );
}

export function OutlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-[30px] items-center gap-1.5 rounded-[8px] border border-primary/70 px-3 text-[12.5px] font-semibold text-fg transition-colors hover:bg-primary/10"
    >
      {children}
      <ArrowRight size={14} />
    </Link>
  );
}

export function PrimaryButton({ children, onClick, type = "button", small }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; small?: boolean }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "btn-solid-red inline-flex items-center justify-center gap-2 rounded-[8px] font-semibold text-white",
        small ? "h-[30px] px-3 text-[12.5px]" : "h-10 px-4 text-[13.5px]",
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#2a2b31] bg-[#0e0f12] px-4 text-[13.5px] font-semibold hover:border-[#3a3b42]"
    >
      {children}
    </button>
  );
}

export function SelectPill<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      aria-label={label}
      className="h-[32px] rounded-[8px] border border-[#24252b] bg-[#0e0f12] pl-3 pr-8 text-[12.5px] text-fg outline-none focus:border-primary/60"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Badge({ tone, children }: { tone: "success" | "warning" | "danger" | "neutral"; children: ReactNode }) {
  const tones = {
    success: "bg-[#0b2a17] text-[#3ee07a] ring-[#14532d]/70",
    warning: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    danger: "bg-[#2a0b10] text-[#ff5a6e] ring-[#5a0c18]/70",
    neutral: "bg-white/[0.05] text-fg-2 ring-white/10",
  };
  return <span className={cn("inline-flex h-[22px] items-center rounded-[6px] px-2 text-[11.5px] font-semibold ring-1", tones[tone])}>{children}</span>;
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2.5 text-[12.5px] text-amber-200/90">
      <Info size={15} className="mt-[1px] shrink-0" />
      <p>
        {children ??
          "Modo demonstração: o banco de dados ainda não está conectado. Alterações ficam salvas apenas neste navegador e servem para validar os fluxos."}
      </p>
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-fg-2">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1 block text-[12px] text-primary">{error}</span> : hint && <span className="mt-1 block text-[11.5px] text-faint">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-[8px] border border-[#1d1e22] bg-[#0e0f11] px-3 text-[13.5px] text-fg outline-none transition-colors focus:border-primary/60";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[24px] w-[44px] shrink-0 rounded-full border transition-colors",
        checked ? "border-primary bg-primary shadow-[0_0_12px_-2px_rgb(230_0_35/0.7)]" : "border-[#2a2b31] bg-[#16171b]",
      )}
    >
      <span className={cn("absolute top-[2px] size-[18px] rounded-full bg-white shadow transition-[left]", checked ? "left-[22px]" : "left-[2px]")} />
    </button>
  );
}

export function Table({ head, children, minWidth = 640 }: { head: ReactNode[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 lg:-mx-[18px] lg:px-[18px]">
      <table className="w-full border-separate border-spacing-0 text-left text-[13px]" style={{ minWidth }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className="border-b border-[#17181c] pb-2.5 pr-3 text-[11px] font-semibold uppercase tracking-wide text-faint">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-[#121317] [&_td]:py-2.5 [&_td]:pr-3">{children}</tbody>
      </table>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(panelClass, "max-h-[90dvh] w-full overflow-y-auto rounded-b-none bg-[#0b0c0f] p-5 sm:max-w-[460px] sm:rounded-[14px]")}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-8 place-items-center rounded-md text-fg-2 hover:bg-white/[0.05]">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
