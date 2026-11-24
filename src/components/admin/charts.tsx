"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const compact = (v: number) =>
  v >= 10000
    ? `R$ ${Math.round(v / 1000)}K`
    : v >= 1000
      ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}K`
      : `R$ ${Math.round(v)}`;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Gráfico de área (um eixo, linhas de 2px, crosshair + tooltip no hover). */
export function AreaChart({
  series,
  labels,
  height = 180,
  ariaLabel,
}: {
  series: AreaSeries[];
  labels: string[];
  height?: number;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 58;
  const padR = 14;
  const padT = 8;
  const padB = 22;
  const n = labels.length;

  const { max, ticks } = useMemo(() => {
    const raw = Math.max(1, ...series.flatMap((s) => s.values));
    const step = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice = Math.ceil(raw / step) * step;
    const t = Array.from({ length: 6 }, (_, i) => (nice / 5) * i);
    return { max: nice, ticks: t };
  }, [series]);

  const w = Math.max(width - padL - padR, 10);
  const h = height - padT - padB;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => padT + h - (v / max) * h;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 52))));

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const i = Math.round(((e.clientX - rect.left - padL) / w) * (n - 1));
            setHover(i >= 0 && i < n ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
          className="overflow-visible"
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.38" />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + w} y1={y(t)} y2={y(t)} stroke="#1a1b20" strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={padL - 10} y={y(t) + 4} textAnchor="end" className="fill-[#9a9ba3] text-[11px]">
                {compact(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            (n - 1 - i) % labelEvery === 0 ? (
              <text key={i} x={x(i)} y={height - 5} textAnchor="middle" className="fill-[#9a9ba3] text-[11px]">
                {l}
              </text>
            ) : null,
          )}
          {series.map((s) => (
            <g key={s.key}>
              <path d={`${path(s.values)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={`url(#fill-${s.key})`} />
              <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(n - 1)} cy={y(s.values[n - 1] ?? 0)} r={4.5} fill={s.color} stroke="#0a0b0d" strokeWidth={2} />
            </g>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + h} stroke="#5a5b63" strokeDasharray="3 3" />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill={s.color} stroke="#0a0b0d" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-[150px] rounded-[10px] border border-border-strong bg-[#121317]/95 px-3 py-2 text-[12px] shadow-xl"
          style={{ left: Math.min(Math.max(x(hover) + 12, 0), width - 160) }}
        >
          <p className="mb-1 font-semibold text-fg">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-3 text-fg-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold text-fg">{brl(s.values[hover] ?? 0)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Rosca com 2px de separação entre segmentos e total ao centro. */
export function DonutChart({
  segments,
  total,
  caption,
  size = 164,
}: {
  segments: { label: string; value: number; color: string }[];
  total: string;
  caption: string;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  const gap = 3;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${caption}: ${total}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#15161a" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / sum) * c;
          const dash = Math.max(len - gap, 0.01);
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? stroke + 4 : stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-acc}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-[stroke-width]"
            >
              <title>{`${s.label}: ${s.value.toLocaleString("pt-BR")}`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[24px] font-bold leading-none tracking-[-0.02em]">
            {hover !== null ? segments[hover]!.value.toLocaleString("pt-BR") : total}
          </p>
          <p className="mt-1 text-[12.5px] text-fg-2">{hover !== null ? segments[hover]!.label : caption}</p>
        </div>
      </div>
    </div>
  );
}
