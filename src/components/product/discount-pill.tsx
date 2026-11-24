import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

/** Selo verde de economia em relação à Steam. */
export function DiscountPill({
  percent,
  size = "sm",
  direction = "up",
  className,
}: {
  percent: number;
  size?: "sm" | "md";
  direction?: "up" | "down";
  className?: string;
}) {
  if (percent <= 0) return null;
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[6px] border border-[#14532d]/70 bg-[#0b2a17] font-semibold text-[#3ee07a]",
        size === "sm" ? "h-[18px] gap-[3px] px-[6px] text-[11.5px]" : "h-[22px] gap-[5px] px-[8px] text-[12.5px]",
        className,
      )}
      aria-label={`${percent}% abaixo da Steam`}
    >
      <Icon size={size === "sm" ? 11 : 13} strokeWidth={2.6} aria-hidden />-{percent}%
    </span>
  );
}
