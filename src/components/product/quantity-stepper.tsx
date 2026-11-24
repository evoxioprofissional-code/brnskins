"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const h = size === "md" ? "h-[39px]" : "h-[32px]";
  const w = size === "md" ? "w-[42px]" : "w-[32px]";
  return (
    <div
      className={cn(
        "flex shrink-0 items-stretch overflow-hidden rounded-[9px] border border-[#202126] bg-[#0d0e10]",
        h,
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Diminuir quantidade"
        className={cn("grid place-items-center text-fg transition-colors hover:bg-white/[0.04] disabled:text-faint", w)}
      >
        <Minus size={size === "md" ? 19 : 15} strokeWidth={2} />
      </button>
      <input
        value={value}
        inputMode="numeric"
        aria-label="Quantidade"
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ""));
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n || min)));
        }}
        className={cn(
          "border-x border-[#202126] bg-transparent text-center font-semibold text-fg outline-none",
          size === "md" ? "w-[43px] text-[16px]" : "w-[34px] text-[13.5px]",
        )}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
        className={cn("grid place-items-center text-fg transition-colors hover:bg-white/[0.04] disabled:text-faint", w)}
      >
        <Plus size={size === "md" ? 19 : 15} strokeWidth={2} />
      </button>
    </div>
  );
}
