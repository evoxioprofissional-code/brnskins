import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Container padrão das páginas internas (mesmos recuos do catálogo). */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("px-4 pb-14 pt-6 lg:px-[40px] lg:pt-[24px]", className)}>{children}</main>;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary">{eyebrow}</p>}
        <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em] lg:text-[26px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[13.5px] text-fg-2">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
