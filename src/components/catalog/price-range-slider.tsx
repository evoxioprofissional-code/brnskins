"use client";

import { useMemo } from "react";
import { formatBRL } from "@/lib/format";

const STEPS = 1000;

/** Arredonda para valores "redondos" de acordo com a magnitude. */
function nice(value: number) {
  if (value < 20) return Math.round(value);
  if (value < 200) return Math.round(value / 5) * 5;
  if (value < 2000) return Math.round(value / 10) * 10;
  if (value < 20000) return Math.round(value / 50) * 50;
  return Math.round(value / 100) * 100;
}

/**
 * Barra de preço com duas alças arrastáveis.
 * Escala logarítmica: skins de R$ 3 e de R$ 48.000 convivem no mesmo catálogo,
 * então uma escala linear deixaria quase tudo espremido no começo da barra.
 */
export function PriceRangeSlider({
  bounds,
  min,
  max,
  onChange,
}: {
  bounds: [number, number];
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const [lo, hi] = bounds;
  const scale = useMemo(() => {
    const ratio = Math.log(hi / lo);
    return {
      toPos: (p: number) => Math.round((Math.log(Math.min(hi, Math.max(lo, p)) / lo) / ratio) * STEPS),
      toPrice: (pos: number) => (pos <= 0 ? lo : pos >= STEPS ? hi : nice(lo * Math.exp((pos / STEPS) * ratio))),
    };
  }, [lo, hi]);

  const a = scale.toPos(min ?? lo);
  const b = scale.toPos(max ?? hi);

  const set = (nextA: number, nextB: number) => {
    const pa = scale.toPrice(nextA);
    const pb = scale.toPrice(nextB);
    onChange(nextA <= 0 ? null : pa, nextB >= STEPS ? null : pb);
  };

  return (
    <div>
      <div className="relative h-[22px]">
        <div className="absolute inset-x-[8px] top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-[#1f2025]" />
        <div
          className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#b5001b,#ff1238)] shadow-[0_0_10px_rgb(230_0_35/0.55)]"
          style={{
            left: `calc(8px + (100% - 16px) * ${a / STEPS})`,
            right: `calc(8px + (100% - 16px) * ${1 - b / STEPS})`,
          }}
        />
        <input
          type="range"
          min={0}
          max={STEPS}
          value={a}
          aria-label="Arrastar preço mínimo"
          aria-valuetext={formatBRL(scale.toPrice(a))}
          onChange={(e) => set(Math.min(Number(e.target.value), b - 10), b)}
          className="price-range"
          style={{ zIndex: a > STEPS - 50 ? 4 : 3 }}
        />
        <input
          type="range"
          min={0}
          max={STEPS}
          value={b}
          aria-label="Arrastar preço máximo"
          aria-valuetext={formatBRL(scale.toPrice(b))}
          onChange={(e) => set(a, Math.max(Number(e.target.value), a + 10))}
          className="price-range"
        />
      </div>
      <div className="mt-[6px] flex items-center justify-between text-[12px] font-semibold tabular-nums">
        <span className="rounded-[6px] bg-white/[0.04] px-[7px] py-[3px]">{formatBRL(scale.toPrice(a))}</span>
        <span className="text-faint">até</span>
        <span className="rounded-[6px] bg-white/[0.04] px-[7px] py-[3px]">
          {formatBRL(scale.toPrice(b))}
        </span>
      </div>
    </div>
  );
}
