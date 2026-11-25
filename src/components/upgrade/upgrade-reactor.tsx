"use client";

import { animate, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { formatMultiplier } from "@/lib/upgrade";

/** Número que anima até o novo valor. */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = format(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, format, reduce]);
  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}

const SIZE = 216;
const STROKE = 12;
const R = (SIZE - STROKE) / 2 - 6;
const C = 2 * Math.PI * R;
const TICKS = 48;

/**
 * Medidor central: mostra quanto do alvo as skins entregues cobrem
 * e o multiplicador do upgrade.
 */
export function UpgradeReactor({
  coverage,
  multiplier,
  hasOffer,
  pendingOnly = false,
  hasTarget,
}: {
  coverage: number;
  multiplier: number;
  hasOffer: boolean;
  /** Há itens na oferta, mas todos aguardam avaliação da equipe */
  pendingOnly?: boolean;
  hasTarget: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, coverage));
  const full = hasOffer && hasTarget && coverage >= 1;
  const active = hasOffer && hasTarget;
  const pct = Math.round(coverage * 100);

  return (
    <div className="relative grid place-items-center" style={{ width: SIZE, height: SIZE }}>
      {/* Brilho de fundo */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-[18%] rounded-full blur-[34px] transition-opacity duration-500",
          active ? "opacity-100" : "opacity-40",
        )}
        style={{ background: full ? "rgb(34 197 94 / 0.35)" : "rgb(230 0 35 / 0.38)" }}
      />

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0" aria-hidden>
        <defs>
          <linearGradient id="reactor-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={full ? "#4ade80" : "#ff4d67"} />
            <stop offset="100%" stopColor={full ? "#16a34a" : "#b8001b"} />
          </linearGradient>
        </defs>

        {/* Marcações externas que giram */}
        <g className="origin-center animate-[reactor-spin_24s_linear_infinite] motion-reduce:animate-none" style={{ transformBox: "fill-box" }}>
          {Array.from({ length: TICKS }, (_, i) => {
            const a = (i / TICKS) * Math.PI * 2;
            const r1 = SIZE / 2 - 2;
            const r2 = r1 - (i % 4 === 0 ? 6 : 3);
            return (
              <line
                key={i}
                x1={SIZE / 2 + Math.cos(a) * r1}
                y1={SIZE / 2 + Math.sin(a) * r1}
                x2={SIZE / 2 + Math.cos(a) * r2}
                y2={SIZE / 2 + Math.sin(a) * r2}
                stroke={i % 4 === 0 ? "#3a3b42" : "#202127"}
                strokeWidth={1.5}
              />
            );
          })}
        </g>

        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="#08090b" stroke="#16171b" strokeWidth={STROKE} />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="url(#reactor-arc)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C * (1 - (active ? clamped : 0)) }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ filter: `drop-shadow(0 0 6px ${full ? "rgb(34 197 94 / 0.7)" : "rgb(230 0 35 / 0.75)"})` }}
        />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R - STROKE - 6} fill="none" stroke="#1a1b20" strokeDasharray="2 6" />
      </svg>

      <div className="relative text-center">
        {active ? (
          <>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">Multiplicador</p>
            <AnimatedNumber
              value={multiplier}
              format={formatMultiplier}
              className={cn("block text-[44px] font-black italic leading-[1.05] tracking-[-0.03em]", full ? "text-[#4ade80]" : "text-white")}
            />
            <p className={cn("mt-0.5 text-[12.5px] font-semibold", full ? "text-[#4ade80]" : "text-fg-2")}>
              {full ? "Cobertura total" : `${pct}% coberto`}
            </p>
          </>
        ) : (
          <>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">Multiplicador</p>
            <p className="mt-1 text-[38px] font-black italic leading-none tracking-[-0.03em] text-white/25">x?</p>
            <p className="mt-2 max-w-[120px] text-[11.5px] leading-snug text-muted">
              {pendingOnly
                ? "Seus itens serão avaliados pela equipe"
                : !hasOffer && !hasTarget
                  ? "Monte sua oferta e escolha o alvo"
                  : !hasOffer
                    ? "Adicione suas skins"
                    : "Escolha o alvo"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
