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

/** Superfície dos painéis: borda em degradê sutil (ver .card-premium em globals.css). */
export const panelClass = "card-premium";

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  /** Mantido por compatibilidade; os títulos não exibem mais ícones. */
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(panelClass, "flex flex-col", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("flex-1 p-5", Boolean(title || actions) && "pt-4", bodyClassName)}>{children}</div>
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
    <span className={cn("inline-flex shrink-0 items-center gap-[2px] text-[12px] font-medium", positive ? "text-[#4ade80]" : "text-[#ff6b7d]")}>
      <Icon size={12} strokeWidth={2.4} aria-hidden />
      {value > 0 ? "+" : ""}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
}

/** Indicador numérico. Use dentro de <KpiStrip> para uma faixa única e limpa. */
export function KpiCard({
  label,
  value,
  trend,
  hint,
  children,
}: {
  label: string;
  value: string;
  trend?: number;
  /** Mantido por compatibilidade; não é exibido. */
  icon?: LucideIcon;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="truncate text-[12.5px] text-muted">{label}</p>
      <p className="mt-1 truncate text-[22px] font-semibold leading-[30px] tracking-[-0.02em] lg:text-[24px]">{value}</p>
      <div className="mt-0.5 flex min-h-[18px] items-center gap-1.5 text-[11.5px] text-faint">
        {trend !== undefined && <Trend value={trend} />}
        {hint && <span className="truncate">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Faixa de indicadores em um único painel, separados por linhas finas. */
export function KpiStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        panelClass,
        "grid grid-cols-1 divide-y divide-white/[0.06] [&>*]:border-white/[0.06] sm:grid-cols-2 sm:divide-y-0 sm:max-xl:[&>*:nth-child(even)]:border-l sm:max-xl:[&>*:nth-child(n+3)]:border-t xl:auto-cols-fr xl:grid-flow-col xl:grid-cols-none xl:divide-x",
        className,
      )}
    >
      {children}
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
    <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted transition-colors hover:text-white">
      {children}
      <ArrowRight size={13} />
    </Link>
  );
}

export function PrimaryButton({ children, onClick, type = "button", small }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; small?: boolean }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[8px] bg-primary font-semibold text-white transition-colors hover:bg-primary-hover",
        small ? "h-[30px] px-3 text-[12.5px]" : "h-9 px-3.5 text-[13px]",
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
      className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/[0.08] px-3.5 text-[13px] font-medium text-fg-2 transition-colors hover:border-white/[0.16] hover:text-white"
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
      className="h-8 rounded-[8px] border border-white/[0.08] bg-transparent pl-2.5 pr-7 text-[12.5px] text-fg-2 outline-none hover:text-white focus:border-primary/60 [&>option]:bg-[#0e0f12]"
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
    success: "text-[#4ade80] before:bg-[#22c55e]",
    warning: "text-amber-300 before:bg-amber-400",
    danger: "text-[#ff6b7d] before:bg-[#ff3b4f]",
    neutral: "text-fg-2 before:bg-white/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium before:size-1.5 before:shrink-0 before:rounded-full before:content-['']",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * Observação discreta da página. O aviso genérico de "modo demonstração"
 * fica no topo do painel (topbar), então sem texto próprio nada é exibido.
 */
export function DemoNotice({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="mb-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
      <Info size={14} className="mt-[2px] shrink-0" />
      <span>{children}</span>
    </p>
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
  "h-10 w-full rounded-[8px] border border-white/[0.08] bg-[#0e0f11] px-3 text-[13.5px] text-fg outline-none transition-colors focus:border-primary/60";

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
        checked ? "border-primary bg-primary" : "border-white/[0.1] bg-[#16171b]",
      )}
    >
      <span className={cn("absolute top-[2px] size-[18px] rounded-full bg-white shadow transition-[left]", checked ? "left-[22px]" : "left-[2px]")} />
    </button>
  );
}

export function Table({ head, children, minWidth = 640 }: { head: ReactNode[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="scrollbar-thin -mx-5 overflow-x-auto px-5">
      <table className="w-full border-separate border-spacing-0 text-left text-[13px]" style={{ minWidth }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className="border-b border-white/[0.06] pb-2.5 pr-4 text-[12px] font-medium text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-white/[0.04] [&_td]:py-3 [&_td]:pr-4 [&_tr:last-child_td]:border-0 [&_tr:hover_td]:bg-white/[0.015]">{children}</tbody>
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
        className={cn(panelClass, "max-h-[90dvh] w-full overflow-y-auto rounded-b-none bg-[#0c0d10] p-6 sm:max-w-[460px] sm:rounded-[14px]")}
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
