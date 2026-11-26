"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";

/** Números exibidos: 1 … 4 5 [6] 7 8 … 40 */
function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  let from = Math.max(2, page - 2);
  let to = Math.min(pages - 1, page + 2);
  if (page <= 4) to = Math.min(pages - 1, 5);
  if (page >= pages - 3) from = Math.max(2, pages - 4);
  if (from > 2) out.push("…");
  for (let p = from; p <= to; p++) out.push(p);
  if (to < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onChange,
  disabled,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    "grid h-9 min-w-9 place-items-center rounded-[10px] px-2 text-[13px] font-semibold tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-35";
  return (
    <nav aria-label="Paginação do catálogo" className="mt-6 flex flex-col items-center gap-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Página anterior"
          className={cn(btn, "border border-[#1c1d21] text-fg-2 hover:border-[#2c2d33] hover:text-white")}
        >
          <ChevronLeft size={16} />
        </button>
        {pageList(page, pages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="grid h-9 w-6 place-items-center text-[13px] text-faint">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              disabled={disabled}
              aria-label={`Página ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                btn,
                p === page ? "glow-active text-white" : "border border-transparent text-fg-2 hover:border-[#2c2d33] hover:text-white",
                p > 99 && "max-sm:hidden",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= pages}
          aria-label="Próxima página"
          className={cn(btn, "border border-[#1c1d21] text-fg-2 hover:border-[#2c2d33] hover:text-white")}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <p className="text-[12px] text-faint">
        {formatInt(from)}–{formatInt(to)} de {formatInt(total)} itens · página {formatInt(page)} de {formatInt(pages)}
      </p>
    </nav>
  );
}
